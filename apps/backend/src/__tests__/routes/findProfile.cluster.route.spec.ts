import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/cluster.service')

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
    profileImages: (p.galleryImages ?? []).map((g: any) => g.image),
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
import { ClusterService } from '@/services/cluster.service'

let fastify: MockFastify
let reply: MockReply
let mockGetOrBuildClusters: ReturnType<typeof vi.fn>
let mockGetLeaves: ReturnType<typeof vi.fn>

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false },
}

beforeEach(async () => {
  mockGetOrBuildClusters = vi.fn()
  mockGetLeaves = vi.fn()

  vi.mocked(ClusterService.getInstance).mockReturnValue({
    getOrBuildClusters: mockGetOrBuildClusters,
    getLeaves: mockGetLeaves,
  } as any)

  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /clusters', () => {
  const handler = () => fastify.routes['GET /clusters']

  const validQuery = {
    south: '45.0',
    north: '48.0',
    west: '16.0',
    east: '23.0',
    zoom: '10',
    kinds: 'profile,post',
  }

  it('returns features and tags for valid bounds and zoom', async () => {
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
    mockGetOrBuildClusters.mockResolvedValue({ features: mockFeatures, tags: mockTags })

    await handler()({ session: mockSession, query: validQuery, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.features).toEqual(mockFeatures)
    expect(reply.payload.tags).toBeDefined()
    expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 45.0, 23.0, 48.0],
      10,
      [],
      ['profile', 'post']
    )
  })

  it('forwards parsed tagIds to the cluster service', async () => {
    mockGetOrBuildClusters.mockResolvedValue({ features: [], tags: [] })

    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, tagIds: 'cabcdef01,cabcdef02' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 45.0, 23.0, 48.0],
      10,
      ['cabcdef01', 'cabcdef02'],
      ['profile', 'post']
    )
  })

  it('forwards parsed kinds to the cluster service', async () => {
    mockGetOrBuildClusters.mockResolvedValue({ features: [], tags: [] })

    await handler()(
      {
        session: mockSession,
        query: { ...validQuery, kinds: 'post' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
      'profile-123',
      [16.0, 45.0, 23.0, 48.0],
      10,
      [],
      ['post']
    )
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
    expect(mockGetOrBuildClusters).not.toHaveBeenCalled()
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
    expect(mockGetOrBuildClusters).not.toHaveBeenCalled()
  })

  it('returns 400 for missing params', async () => {
    await handler()(
      { session: mockSession, query: { south: '45.0' }, log: { error: vi.fn() } },
      reply
    )

    expect(reply.statusCode).toBe(400)
    expect(mockGetOrBuildClusters).not.toHaveBeenCalled()
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
    expect(mockGetOrBuildClusters).not.toHaveBeenCalled()
  })
})

describe('GET /cluster-leaves', () => {
  const handler = () => fastify.routes['GET /cluster-leaves']

  it('returns features for valid clusterId', async () => {
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
    mockGetLeaves.mockReturnValue(mockFeatures)

    await handler()(
      {
        session: mockSession,
        query: { clusterId: '42', kinds: 'profile,post' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.features).toEqual(mockFeatures)
    expect(mockGetLeaves).toHaveBeenCalledWith('profile-123', 42, [], ['profile', 'post'])
  })

  it('forwards tagIds so the correct cached index is queried', async () => {
    mockGetLeaves.mockReturnValue([])

    await handler()(
      {
        session: mockSession,
        query: { clusterId: '42', tagIds: 'cabcdef01', kinds: 'profile,post' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockGetLeaves).toHaveBeenCalledWith(
      'profile-123',
      42,
      ['cabcdef01'],
      ['profile', 'post']
    )
  })

  it('returns 400 for missing clusterId', async () => {
    await handler()({ session: mockSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(400)
    expect(mockGetLeaves).not.toHaveBeenCalled()
  })
})
