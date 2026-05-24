import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/search.service')

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName,
    profileImages: (p.profileImages ?? []).map((g: any) => g.image),
    location: p.location ?? { country: '' },
  })),
}))

vi.mock('../../api/mappers/post.mappers', () => ({
  mapPostSummary: vi.fn((p: any) => ({
    id: p.id,
    kind: 'post',
    type: p.type,
    content: p.content,
    location: p.location ?? { country: '' },
    postedBy: {
      id: p.postedBy.id,
      publicName: p.postedBy.publicName,
      profileImages: (p.postedBy.profileImages ?? []).map((g: any) => g.image),
    },
  })),
  mapEventSummary: vi.fn((e: any) => ({
    id: e.id,
    kind: 'event',
    content: e.content,
    startsAt: e.event.startsAt,
    location: e.location ?? { country: '' },
    postedBy: {
      id: e.postedBy.id,
      publicName: e.postedBy.publicName,
      profileImages: (e.postedBy.profileImages ?? []).map((g: any) => g.image),
    },
  })),
  mapCommunitySummary: vi.fn((c: any) => ({
    id: c.id,
    kind: 'community',
    content: c.content,
    yearFounded: c.community.yearFounded,
    location: c.location ?? { country: '' },
    postedBy: {
      id: c.postedBy.id,
      publicName: c.postedBy.publicName,
      profileImages: (c.postedBy.profileImages ?? []).map((g: any) => g.image),
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
    mockSearch.mockResolvedValue({ tags: [], profiles: [], posts: [], events: [], communities: [] })

    await handler()(
      { session: { ...baseSession, lang: 'hu' }, query: { q: 'guitar' }, log: { error: vi.fn() } },
      reply
    )

    expect(mockSearch).toHaveBeenCalledWith('guitar', 'hu', 'profile-123')
  })

  it('returns grouped results mapped to public/summary shapes', async () => {
    const startsAt = new Date('2026-06-01T18:00:00Z')
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
      profiles: [
        {
          id: 'p1',
          publicName: 'Alice',
          profileImages: [{ image: { storagePath: 'a/b' } }],
        },
      ],
      posts: [
        {
          id: 'post-1',
          type: 'OFFER',
          content: 'Guitar lessons',
          postedBy: {
            id: 'p1',
            publicName: 'Alice',
            profileImages: [{ image: { storagePath: 'a/b' } }],
          },
        },
      ],
      events: [
        {
          id: 'evt-1',
          content: 'Guitar concert',
          event: { startsAt },
          postedBy: {
            id: 'p1',
            publicName: 'Alice',
            profileImages: [{ image: { storagePath: 'a/b' } }],
          },
        },
      ],
      communities: [
        {
          id: 'com-1',
          content: 'Guitar players',
          community: { yearFounded: 2010 },
          postedBy: {
            id: 'p1',
            publicName: 'Alice',
            profileImages: [{ image: { storagePath: 'a/b' } }],
          },
        },
      ],
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
      kind: 'post',
      type: 'OFFER',
      content: 'Guitar lessons',
      postedBy: { id: 'p1', publicName: 'Alice' },
    })
    expect(reply.payload.events[0]).toMatchObject({
      id: 'evt-1',
      kind: 'event',
      content: 'Guitar concert',
      startsAt,
      postedBy: { id: 'p1', publicName: 'Alice' },
    })
    expect(reply.payload.communities[0]).toMatchObject({
      id: 'com-1',
      kind: 'community',
      content: 'Guitar players',
      yearFounded: 2010,
      postedBy: { id: 'p1', publicName: 'Alice' },
    })
  })

  it('defaults missing q to empty string (and the service short-circuits)', async () => {
    mockSearch.mockResolvedValue({ tags: [], profiles: [], posts: [], events: [], communities: [] })

    await handler()({ session: baseSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(mockSearch).toHaveBeenCalledWith('', 'en', 'profile-123')
    expect(reply.payload).toEqual({
      success: true,
      tags: [],
      profiles: [],
      posts: [],
      events: [],
      communities: [],
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
