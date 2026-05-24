import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any
let mockTagSearch: ReturnType<typeof vi.fn>

/**
 * Install a routing mock for `$queryRaw` that dispatches by inspecting the
 * template SQL. Profiles query hits `LocalizedProfileField`; UserContent
 * queries hit `FROM "UserContent"` and embed the kind as a raw SQL fragment
 * (e.g. `'post'::"ContentKind"`) which we parse out to dispatch per kind.
 * Returns separate capture arrays + setters so tests can control each
 * branch independently.
 */
function installQueryRawRouter() {
  const profileCalls: unknown[][] = []
  const postCalls: unknown[][] = []
  const eventCalls: unknown[][] = []
  const communityCalls: unknown[][] = []
  let profileResult: any[] = []
  let postResult: any[] = []
  let eventResult: any[] = []
  let communityResult: any[] = []

  /**
   * The ContentKind enum literal is injected via `Prisma.sql([...])` and
   * arrives in the `values` array (not the `strings` array). We sniff each
   * value's `.strings[0]` — `Prisma.sql` stores fragments there — to route
   * by kind.
   */
  const findKind = (values: unknown[]): 'post' | 'event' | 'community' | null => {
    for (const v of values) {
      const frag = (v as { strings?: string[] })?.strings?.[0] ?? ''
      if (frag.includes(`'event'`)) return 'event'
      if (frag.includes(`'community'`)) return 'community'
      if (frag.includes(`'post'`)) return 'post'
    }
    return null
  }

  mockPrisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = Array.isArray(strings) ? strings.join('?') : String(strings)
    if (sql.includes('LocalizedProfileField')) {
      profileCalls.push([strings, ...values])
      return Promise.resolve(profileResult)
    }
    if (sql.includes('FROM "UserContent"')) {
      const kind = findKind(values)
      if (kind === 'event') {
        eventCalls.push([strings, ...values])
        return Promise.resolve(eventResult)
      }
      if (kind === 'community') {
        communityCalls.push([strings, ...values])
        return Promise.resolve(communityResult)
      }
      postCalls.push([strings, ...values])
      return Promise.resolve(postResult)
    }
    return Promise.resolve([])
  })

  return {
    profileCalls,
    postCalls,
    eventCalls,
    communityCalls,
    setProfileResult: (r: any[]) => {
      profileResult = r
    },
    setPostResult: (r: any[]) => {
      postResult = r
    },
    setEventResult: (r: any[]) => {
      eventResult = r
    },
    setCommunityResult: (r: any[]) => {
      communityResult = r
    },
  }
}

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  // Raw SQL helper + post table are not in the default mock.
  mockPrisma.$queryRaw = vi.fn().mockResolvedValue([])
  mockPrisma.userContent = { findMany: vi.fn().mockResolvedValue([]) }

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
    expect(result).toEqual({ tags: [], profiles: [], posts: [], events: [], communities: [] })
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
    // The post hydration `findMany` is dispatched with `where.kind = 'post'`;
    // mock it to return only post rows, and let event/community hydration
    // default to []. We key on `where.kind` to route per-kind hydration.
    mockPrisma.userContent.findMany.mockImplementation(({ where }: any) => {
      if (where?.kind === 'post') {
        return Promise.resolve([
          {
            id: 'post-a',
            kind: 'post',
            content: 'hello',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            post: { type: 'OFFER' },
            postedBy: { id: 'p1', publicName: 'Alice', profileImages: [] },
          },
          {
            id: 'post-b',
            kind: 'post',
            content: 'world',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            post: { type: 'REQUEST' },
            postedBy: { id: 'p2', publicName: 'Bob', profileImages: [] },
          },
        ])
      }
      return Promise.resolve([])
    })

    const result = await service.search('hello', 'en', 'me')

    expect(router.postCalls).toHaveLength(1)
    expect(result.posts.map((p: any) => p.id)).toEqual(['post-b', 'post-a'])
  })

  it('skips hydration when no posts match', async () => {
    installQueryRawRouter()

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.posts).toEqual([])
    // No `id: {in: …}` hydration should have been issued for any kind.
    const hydrationCalls = mockPrisma.userContent.findMany.mock.calls.filter(
      ([arg]: [any]) => arg?.where?.id?.in !== undefined
    )
    expect(hydrationCalls).toHaveLength(0)
  })
})

describe('SearchService.search — events (trigram)', () => {
  it('runs the event query and hydrates events in rank order with startsAt', async () => {
    const router = installQueryRawRouter()
    router.setEventResult([
      { id: 'evt-b', rank: 0.9 },
      { id: 'evt-a', rank: 0.5 },
    ])
    const startsAtA = new Date('2026-06-01T18:00:00Z')
    const startsAtB = new Date('2026-07-15T20:00:00Z')
    mockPrisma.userContent.findMany.mockImplementation(({ where }: any) => {
      if (where?.kind === 'event') {
        return Promise.resolve([
          {
            id: 'evt-a',
            kind: 'event',
            content: 'concert',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            event: { startsAt: startsAtA },
            postedBy: { id: 'p1', publicName: 'Alice', profileImages: [] },
          },
          {
            id: 'evt-b',
            kind: 'event',
            content: 'meetup',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            event: { startsAt: startsAtB },
            postedBy: { id: 'p2', publicName: 'Bob', profileImages: [] },
          },
        ])
      }
      return Promise.resolve([])
    })

    const result = await service.search('concert', 'en', 'me')

    expect(router.eventCalls).toHaveLength(1)
    expect(result.events.map((e: any) => e.id)).toEqual(['evt-b', 'evt-a'])
    expect(result.events[0].event.startsAt).toBe(startsAtB)
  })

  it('returns empty events array when no events match', async () => {
    installQueryRawRouter()

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.events).toEqual([])
  })
})

describe('SearchService.search — communities (trigram)', () => {
  it('runs the community query and hydrates with yearFounded', async () => {
    const router = installQueryRawRouter()
    router.setCommunityResult([{ id: 'com-a', rank: 0.9 }])
    mockPrisma.userContent.findMany.mockImplementation(({ where }: any) => {
      if (where?.kind === 'community') {
        return Promise.resolve([
          {
            id: 'com-a',
            kind: 'community',
            content: 'book club',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            community: { yearFounded: 1998 },
            postedBy: { id: 'p1', publicName: 'Alice', profileImages: [] },
          },
        ])
      }
      return Promise.resolve([])
    })

    const result = await service.search('book', 'en', 'me')

    expect(router.communityCalls).toHaveLength(1)
    expect(result.communities.map((c: any) => c.id)).toEqual(['com-a'])
    expect(result.communities[0].community.yearFounded).toBe(1998)
  })

  it('preserves a null yearFounded through to the result', async () => {
    const router = installQueryRawRouter()
    router.setCommunityResult([{ id: 'com-b', rank: 0.7 }])
    mockPrisma.userContent.findMany.mockImplementation(({ where }: any) => {
      if (where?.kind === 'community') {
        return Promise.resolve([
          {
            id: 'com-b',
            kind: 'community',
            content: 'no-year community',
            country: null,
            cityName: null,
            lat: null,
            lon: null,
            community: { yearFounded: null },
            postedBy: { id: 'p1', publicName: 'Alice', profileImages: [] },
          },
        ])
      }
      return Promise.resolve([])
    })

    const result = await service.search('community', 'en', 'me')

    expect(result.communities[0].community.yearFounded).toBeNull()
  })
})
