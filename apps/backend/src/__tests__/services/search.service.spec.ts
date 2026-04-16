import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any
let mockTagSearch: ReturnType<typeof vi.fn>

/**
 * Install a routing mock for `$queryRaw` that dispatches by inspecting the
 * template SQL. Profiles query hits `LocalizedProfileField`; posts query
 * hits `FROM "Post"`. Returns separate capture arrays + setters so tests
 * can control each branch independently.
 */
function installQueryRawRouter() {
  const profileCalls: unknown[][] = []
  const postCalls: unknown[][] = []
  let profileResult: any[] = []
  let postResult: any[] = []

  mockPrisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Array.isArray(strings) ? strings.join('?') : String(strings)
    if (sql.includes('LocalizedProfileField')) {
      profileCalls.push([strings, ...values])
      return Promise.resolve(profileResult)
    }
    if (sql.includes('FROM "Post"')) {
      postCalls.push([strings, ...values])
      return Promise.resolve(postResult)
    }
    return Promise.resolve([])
  })

  return {
    profileCalls,
    postCalls,
    setProfileResult: (r: any[]) => {
      profileResult = r
    },
    setPostResult: (r: any[]) => {
      postResult = r
    },
  }
}

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  // Raw SQL helper + post table are not in the default mock.
  mockPrisma.$queryRaw = vi.fn().mockResolvedValue([])
  mockPrisma.post = { findMany: vi.fn().mockResolvedValue([]) }

  mockTagSearch = vi.fn().mockResolvedValue([])

  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  vi.doMock('../../services/tag.service', () => ({
    TagService: {
      getInstance: () => ({ search: mockTagSearch }),
    },
  }))

  const module = await import('../../services/search.service')
  ;(module.SearchService as any).instance = undefined
  service = module.SearchService.getInstance()
})

describe('SearchService.search — short-circuit', () => {
  it('returns empty arrays for queries shorter than the minimum length', async () => {
    const result = await service.search('a', 'en', 'me')
    expect(result).toEqual({ tags: [], profiles: [], posts: [] })
    expect(mockTagSearch).not.toHaveBeenCalled()
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('treats whitespace-only queries as empty', async () => {
    const result = await service.search('   ', 'en', 'me')
    expect(result.tags).toEqual([])
  })

  it('trims and collapses whitespace before the length check', async () => {
    // "a b" trims to "a b" (length 3), so it should dispatch.
    await service.search('  a  b  ', 'en', 'me')

    expect(mockTagSearch).toHaveBeenCalledWith('a b', 'en', { limit: 5 })
  })
})

describe('SearchService.search — tags', () => {
  it('delegates to TagService with the 5-result limit', async () => {
    mockTagSearch.mockResolvedValue([{ id: 't1', name: 'Music', translations: [] }])

    const result = await service.search('mus', 'hu', 'me')

    expect(mockTagSearch).toHaveBeenCalledWith('mus', 'hu', { limit: 5 })
    expect(result.tags).toHaveLength(1)
  })
})

describe('SearchService.search — profiles (trigram)', () => {
  it('passes session-locale + "en" to the raw query for non-english locales', async () => {
    const router = installQueryRawRouter()
    router.setProfileResult([{ id: 'p1', rank: 0.8 }])
    mockPrisma.profile.findMany.mockResolvedValue([
      { id: 'p1', publicName: 'Alice', profileImages: [] },
    ])

    await service.search('guitar', 'hu', 'me')

    expect(router.profileCalls).toHaveLength(1)
    // `Prisma.join(['hu', 'en'])` produces a Prisma.Sql whose underlying
    // values array carries the locale strings — serialize everything the
    // mock received and verify both locales surface somewhere in it.
    const serialized = JSON.stringify(router.profileCalls[0])
    expect(serialized).toContain('"hu"')
    expect(serialized).toContain('"en"')
  })

  it('only passes "en" when session locale is english', async () => {
    const router = installQueryRawRouter()

    await service.search('guitar', 'en', 'me')

    const serialized = JSON.stringify(router.profileCalls[0])
    expect(serialized).toContain('"en"')
    expect(serialized).not.toContain('"hu"')
  })

  it('hydrates matching profiles and preserves rank order', async () => {
    const router = installQueryRawRouter()
    router.setProfileResult([
      { id: 'p2', rank: 0.9 },
      { id: 'p1', rank: 0.5 },
    ])
    // findMany returns out of rank order — service must reorder.
    mockPrisma.profile.findMany.mockResolvedValue([
      { id: 'p1', publicName: 'Alice', profileImages: [] },
      { id: 'p2', publicName: 'Bob', profileImages: [] },
    ])

    const result = await service.search('guitar', 'en', 'me')

    expect(result.profiles.map((p: any) => p.id)).toEqual(['p2', 'p1'])
  })

  it('returns empty profiles array and skips hydration when no rows match', async () => {
    installQueryRawRouter() // both profile and post default to []

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.profiles).toEqual([])
    // Hydration uses `where: { id: { in: [...] } }`; the location query uses
    // `where: { cityName: ... }`. Assert no hydration was issued.
    const hydrationCalls = mockPrisma.profile.findMany.mock.calls.filter(
      ([arg]: [any]) => arg?.where?.id?.in !== undefined
    )
    expect(hydrationCalls).toHaveLength(0)
  })
})

describe('SearchService.search — posts (trigram)', () => {
  it('runs the post query and hydrates posts in rank order', async () => {
    const router = installQueryRawRouter()
    router.setPostResult([
      { id: 'post-b', rank: 0.9 },
      { id: 'post-a', rank: 0.5 },
    ])
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: 'post-a',
        type: 'OFFER',
        content: 'hello',
        postedBy: { id: 'p1', publicName: 'Alice', profileImages: [] },
      },
      {
        id: 'post-b',
        type: 'REQUEST',
        content: 'world',
        postedBy: { id: 'p2', publicName: 'Bob', profileImages: [] },
      },
    ])

    const result = await service.search('hello', 'en', 'me')

    expect(router.postCalls).toHaveLength(1)
    expect(result.posts.map((p: any) => p.id)).toEqual(['post-b', 'post-a'])
  })

  it('skips hydration when no posts match', async () => {
    installQueryRawRouter()

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.posts).toEqual([])
    const hydrationCalls = mockPrisma.post.findMany.mock.calls.filter(
      ([arg]: [any]) => arg?.where?.id?.in !== undefined
    )
    expect(hydrationCalls).toHaveLength(0)
  })
})
