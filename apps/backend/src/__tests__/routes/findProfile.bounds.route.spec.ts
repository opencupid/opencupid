import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/poiBounds.service')

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesWithLocation: vi.fn(),
      findMutualMatchIds: vi.fn(),
      findNewProfilesAnywhere: vi.fn(),
    }),
  },
}))

vi.mock('@/services/profile.service', () => ({
  ProfileService: {
    getInstance: () => ({
      getProfileByUserId: vi.fn(),
    }),
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileToPublic: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName,
    location: { country: p.country, cityName: p.cityName, lat: p.lat, lon: p.lon },
    profileImages: p.profileImages ?? [],
    tags: p.tags ?? [],
  })),
}))

vi.mock('../../api/mappers/tag.mappers', () => ({
  mapProfileTagsTranslated: vi.fn((tags: any[]) =>
    tags.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug }))
  ),
}))

import findProfileRoutes from '../../api/routes/findProfile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import { PoiBoundsService } from '@/services/poiBounds.service'

let fastify: MockFastify
let reply: MockReply
let mockGetPois: ReturnType<typeof vi.fn>

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false },
}

beforeEach(async () => {
  mockGetPois = vi.fn()

  vi.mocked(PoiBoundsService.getInstance).mockReturnValue({
    getPois: mockGetPois,
  } as any)

  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /bounds', () => {
  const handler = () => fastify.routes['GET /bounds']

  const validQuery = {
    south: '45.0',
    north: '48.0',
    west: '16.0',
    east: '23.0',
    kinds: 'profile,post',
  }

  it('returns features and tags for valid bounds', async () => {
    const mockFeatures = [
      {
        type: 'point',
        kind: 'profile',
        id: 'p1',
        lat: 47,
        lon: 19,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
    ]
    const mockTags = [{ id: 't1', name: 'Bio', slug: 'bio' }]
    mockGetPois.mockResolvedValue({ features: mockFeatures, tags: mockTags })

    await handler()({ session: mockSession, query: validQuery, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.features).toEqual(mockFeatures)
    expect(reply.payload.tags).toBeDefined()
    expect(mockGetPois).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 45.0, 23.0, 48.0],
      [],
      ['profile', 'post']
    )
  })

  it('forwards parsed tagIds to the bounds service', async () => {
    mockGetPois.mockResolvedValue({ features: [], tags: [] })

    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, tagIds: 'cabcdef01,cabcdef02' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockGetPois).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 45.0, 23.0, 48.0],
      ['cabcdef01', 'cabcdef02'],
      ['profile', 'post']
    )
  })

  it('forwards parsed kinds to the bounds service', async () => {
    mockGetPois.mockResolvedValue({ features: [], tags: [] })

    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, kinds: 'post' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockGetPois).toHaveBeenCalledWith('profile-123', [16.0, 45.0, 23.0, 48.0], [], ['post'])
  })

  it('returns 400 when kinds is empty', async () => {
    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, kinds: '' },
        log: { error: vi.fn() },
      },
      reply
    )
    expect(reply.statusCode).toBe(400)
    expect(mockGetPois).not.toHaveBeenCalled()
  })

  it('returns 400 when kinds is unknown', async () => {
    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, kinds: 'unknown' },
        log: { error: vi.fn() },
      },
      reply
    )
    expect(reply.statusCode).toBe(400)
    expect(mockGetPois).not.toHaveBeenCalled()
  })

  it('returns 400 for missing params', async () => {
    await handler()(
      { session: mockSession, query: { south: '45.0' }, log: { error: vi.fn() } },
      reply
    )

    expect(reply.statusCode).toBe(400)
    expect(mockGetPois).not.toHaveBeenCalled()
  })

  it('returns 403 when social is not active', async () => {
    await handler()(
      {
        session: { ...mockSession, profile: { ...mockSession.profile, isSocialActive: false } },
        query: validQuery,
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(403)
    expect(mockGetPois).not.toHaveBeenCalled()
  })

  it('returns 500 when the service rejects', async () => {
    mockGetPois.mockRejectedValue(new Error('db down'))

    await handler()({ session: mockSession, query: validQuery, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('deprecated /clusters and /cluster-leaves shims', () => {
  it('returns an empty success envelope from /clusters', async () => {
    await fastify.routes['GET /clusters']!(
      { session: mockSession, query: {}, log: { error: vi.fn() } },
      reply
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, features: [], tags: [] })
  })

  it('returns an empty success envelope from /cluster-leaves', async () => {
    await fastify.routes['GET /cluster-leaves']!(
      { session: mockSession, query: {}, log: { error: vi.fn() } },
      reply
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, features: [] })
  })
})
