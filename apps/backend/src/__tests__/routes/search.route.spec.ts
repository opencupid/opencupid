import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/search.service')

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName,
    profileImages: p.profileImages ?? [],
  })),
}))

vi.mock('../../api/mappers/post.mappers', () => ({
  mapPostSummary: vi.fn((p: any) => ({
    id: p.id,
    type: p.type,
    content: p.content,
    location: p.location ?? { country: '' },
    postedBy: {
      id: p.postedBy.id,
      publicName: p.postedBy.publicName,
      profileImages: p.postedBy.profileImages ?? [],
    },
  })),
}))

import searchRoutes from '../../api/routes/search.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import { SearchService } from '@/services/search.service'

let fastify: MockFastify
let reply: MockReply
let mockSearch: ReturnType<typeof vi.fn>

const baseSession = {
  userId: 'user-1',
  profileId: 'profile-123',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false, isActive: true },
}

beforeEach(async () => {
  mockSearch = vi.fn()
  vi.mocked(SearchService.getInstance).mockReturnValue({ search: mockSearch } as any)

  fastify = new MockFastify()
  reply = new MockReply()
  await searchRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /search', () => {
  const handler = () => fastify.routes['GET /']

  it('forwards session language and profileId to the service', async () => {
    mockSearch.mockResolvedValue({ tags: [], profiles: [], posts: [], locations: [] })

    await handler()(
      { session: { ...baseSession, lang: 'hu' }, query: { q: 'guitar' }, log: { error: vi.fn() } },
      reply
    )

    expect(mockSearch).toHaveBeenCalledWith('guitar', 'hu', 'profile-123')
  })

  it('returns grouped results mapped to public/summary shapes', async () => {
    mockSearch.mockResolvedValue({
      tags: [
        {
          id: 'tag-1',
          name: 'Music',
          slug: 'music',
          originalLocale: 'en',
          translations: [{ name: 'Zene', locale: 'hu' }],
        },
      ],
      profiles: [{ id: 'p1', publicName: 'Alice', profileImages: [{ storagePath: 'a/b' }] }],
      posts: [
        {
          id: 'post-1',
          type: 'OFFER',
          content: 'Guitar lessons',
          postedBy: { id: 'p1', publicName: 'Alice', profileImages: [{ storagePath: 'a/b' }] },
        },
      ],
      locations: [{ cityName: 'Budapest', country: 'HU', lat: 47.5, lon: 19.0 }],
    })

    await handler()(
      { session: { ...baseSession, lang: 'hu' }, query: { q: 'guitar' }, log: { error: vi.fn() } },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags[0].name).toBe('Zene') // localized for session
    expect(reply.payload.profiles[0]).toMatchObject({ id: 'p1', publicName: 'Alice' })
    expect(reply.payload.posts[0]).toMatchObject({
      id: 'post-1',
      type: 'OFFER',
      content: 'Guitar lessons',
      postedBy: { id: 'p1', publicName: 'Alice' },
    })
    expect(reply.payload.locations[0]).toMatchObject({ cityName: 'Budapest', country: 'HU' })
  })

  it('defaults missing q to empty string (and the service short-circuits)', async () => {
    mockSearch.mockResolvedValue({ tags: [], profiles: [], posts: [], locations: [] })

    await handler()({ session: baseSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(mockSearch).toHaveBeenCalledWith('', 'en', 'profile-123')
    expect(reply.payload).toEqual({
      success: true,
      tags: [],
      profiles: [],
      posts: [],
      locations: [],
    })
  })

  it('returns 403 when the caller is not social-active', async () => {
    const session = {
      ...baseSession,
      profile: { ...baseSession.profile, isSocialActive: false },
    }

    await handler()({ session, query: { q: 'buda' }, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(403)
    expect(reply.payload.success).toBe(false)
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('returns a 500 with a generic message when the service throws', async () => {
    const log = { error: vi.fn() }
    mockSearch.mockRejectedValue(new Error('boom'))

    await handler()({ session: baseSession, query: { q: 'buda' }, log }, reply)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
    expect(log.error).toHaveBeenCalled()
  })
})
