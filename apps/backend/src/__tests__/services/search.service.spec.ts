import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any
let mockTagSearch: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  // Raw SQL helpers + post table are not in the default mock.
  mockPrisma.$queryRaw = vi.fn()
  mockPrisma.$queryRawUnsafe = vi.fn()
  mockPrisma.post = { findMany: vi.fn() }

  mockTagSearch = vi.fn()

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
    expect(result).toEqual({ tags: [], profiles: [], posts: [], locations: [] })
    expect(mockTagSearch).not.toHaveBeenCalled()
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled()
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('treats whitespace-only queries as empty', async () => {
    const result = await service.search('   ', 'en', 'me')
    expect(result.tags).toEqual([])
  })

  it('trims and collapses whitespace before the length check', async () => {
    // "a b" trims to "a b" (length 3), so it should dispatch.
    mockTagSearch.mockResolvedValue([])
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.post.findMany.mockResolvedValue([])

    await service.search('  a  b  ', 'en', 'me')

    expect(mockTagSearch).toHaveBeenCalledWith('a b', 'en', { limit: 5 })
  })
})

describe('SearchService.search — tags', () => {
  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.post.findMany.mockResolvedValue([])
  })

  it('delegates to TagService with the 5-result limit', async () => {
    mockTagSearch.mockResolvedValue([{ id: 't1', name: 'Music', translations: [] }])

    const result = await service.search('mus', 'hu', 'me')

    expect(mockTagSearch).toHaveBeenCalledWith('mus', 'hu', { limit: 5 })
    expect(result.tags).toHaveLength(1)
  })
})

describe('SearchService.search — profiles (FTS)', () => {
  beforeEach(() => {
    mockTagSearch.mockResolvedValue([])
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockPrisma.post.findMany.mockResolvedValue([])
    mockPrisma.profile.findMany.mockResolvedValue([])
  })

  it('runs the UNION-shaped FTS query with session + english branches for non-english locales', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: 'p1', rank: 0.8 }])
    mockPrisma.profile.findMany.mockResolvedValue([
      { id: 'p1', publicName: 'Alice', profileImages: [] },
    ])

    await service.search('guitar', 'hu', 'me')

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)
    const [sql, term, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0]
    // Two locale branches ⇒ UNION ALL appears once.
    expect(sql).toMatch(/UNION ALL/)
    expect(term).toBe('guitar')
    // params interleave [dict, locale, dict, locale, ...]; ensure 'hungarian' and 'english' both used.
    expect(params).toContain('hungarian')
    expect(params).toContain('english')
    // myProfileId tacked on at the end
    expect(params[params.length - 1]).toBe('me')
  })

  it('collapses to a single branch when session locale is english', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])

    await service.search('guitar', 'en', 'me')

    const [sql, , ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0]
    // Single branch → no UNION.
    expect(sql).not.toMatch(/UNION ALL/)
    expect(params).toContain('english')
    expect(params).not.toContain('hungarian')
  })

  it('hydrates matching profiles and preserves rank order', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
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

  it('returns empty profiles array and skips hydration when no FTS rows match', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.profiles).toEqual([])
    // The hydration query uses `where: { id: { in: [...] } }` — verify we never
    // issued one of those (the location query also calls profile.findMany).
    const hydrationCalls = mockPrisma.profile.findMany.mock.calls.filter(
      ([arg]: [any]) => arg?.where?.id?.in !== undefined
    )
    expect(hydrationCalls).toHaveLength(0)
  })
})

describe('SearchService.search — posts (FTS)', () => {
  beforeEach(() => {
    mockTagSearch.mockResolvedValue([])
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.post.findMany.mockResolvedValue([])
  })

  it('runs an FTS query and hydrates posts in rank order', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
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

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(result.posts.map((p: any) => p.id)).toEqual(['post-b', 'post-a'])
  })

  it('skips hydration when no posts match', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([])

    const result = await service.search('xyzzy', 'en', 'me')

    expect(result.posts).toEqual([])
    // Hydration uses `where: { id: { in: [...] } }`; the location query uses
    // `where: { cityName: ... }`. Assert no hydration was issued.
    const hydrationCalls = mockPrisma.post.findMany.mock.calls.filter(
      ([arg]: [any]) => arg?.where?.id?.in !== undefined
    )
    expect(hydrationCalls).toHaveLength(0)
  })
})

describe('SearchService.search — locations', () => {
  beforeEach(() => {
    mockTagSearch.mockResolvedValue([])
    mockPrisma.$queryRawUnsafe.mockResolvedValue([])
    mockPrisma.$queryRaw.mockResolvedValue([])
  })

  it('dedupes by case-insensitive city name across profile + post sources', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      { cityName: 'Budapest', country: 'HU', lat: 47.5, lon: 19.0 },
      { cityName: 'budapest', country: 'HU', lat: 47.5, lon: 19.0 }, // dupe
    ])
    mockPrisma.post.findMany.mockResolvedValue([
      { cityName: 'Budaörs', country: 'HU', lat: 47.46, lon: 18.96 },
      { cityName: 'Budapest', country: 'HU', lat: 47.5, lon: 19.0 }, // dupe
    ])

    const result = await service.search('buda', 'en', 'me')

    expect(result.locations.map((l: any) => l.cityName)).toEqual(['Budapest', 'Budaörs'])
  })

  it('drops rows without a city name', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      { cityName: '', country: 'HU', lat: null, lon: null },
      { cityName: null, country: 'HU', lat: null, lon: null },
      { cityName: 'Győr', country: 'HU', lat: 47.68, lon: 17.63 },
    ])
    mockPrisma.post.findMany.mockResolvedValue([])

    const result = await service.search('gyo', 'en', 'me')

    expect(result.locations.map((l: any) => l.cityName)).toEqual(['Győr'])
  })

  it('caps locations at the per-category limit', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      cityName: `City${i}`,
      country: 'HU',
      lat: null,
      lon: null,
    }))
    mockPrisma.profile.findMany.mockResolvedValue(many)
    mockPrisma.post.findMany.mockResolvedValue([])

    const result = await service.search('city', 'en', 'me')

    expect(result.locations).toHaveLength(5)
  })

  it('surfaces locations even when tag/profile/post queries are empty', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      { cityName: 'Budapest', country: 'HU', lat: 47.5, lon: 19.0 },
    ])
    mockPrisma.post.findMany.mockResolvedValue([])

    const result = await service.search('buda', 'en', 'me')

    expect(result.tags).toEqual([])
    expect(result.profiles).toEqual([])
    expect(result.posts).toEqual([])
    expect(result.locations).toHaveLength(1)
  })
})
