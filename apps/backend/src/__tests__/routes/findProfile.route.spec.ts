import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFindSocialProfilesInBounds = vi.fn()
const mockFindMutualMatchIds = vi.fn()
const mockFindNewProfilesAnywhere = vi.fn()

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesInBounds: mockFindSocialProfilesInBounds,
      findMutualMatchIds: mockFindMutualMatchIds,
      findNewProfilesAnywhere: mockFindNewProfilesAnywhere,
    }),
  },
}))

vi.mock('@/services/cluster.service', () => ({
  ClusterService: {
    getInstance: () => ({
      getOrBuildClusters: vi.fn(),
      getLeaves: vi.fn(),
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

import findProfileRoutes from '../../api/routes/findProfile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
  profile: { isSocialActive: true, isDatingActive: false },
}

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /social/map/bounds', () => {
  const handler = () => fastify.routes['GET /social/map/bounds']

  it('returns profiles within bounds', async () => {
    const mockProfiles = [
      {
        id: 'p1',
        publicName: 'Alice',
        lat: 47.5,
        lon: 19.0,
        country: 'HU',
        cityName: 'Budapest',
        profileImages: [],
        tags: [],
      },
    ]
    mockFindSocialProfilesInBounds.mockResolvedValue(mockProfiles)

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
    expect(mockFindSocialProfilesInBounds).toHaveBeenCalledWith(
      'profile-123',
      { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
      [],
      [{ updatedAt: 'desc' }]
    )
  })

  it('parses comma-separated tagIds and forwards them to the service', async () => {
    mockFindSocialProfilesInBounds.mockResolvedValue([])

    await handler()(
      {
        session: mockSession,
        query: {
          south: '45.0',
          north: '48.0',
          west: '16.0',
          east: '23.0',
          tagIds: 'cabcdef01,cabcdef02,cabcdef03',
        },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(mockFindSocialProfilesInBounds).toHaveBeenCalledWith(
      'profile-123',
      { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
      ['cabcdef01', 'cabcdef02', 'cabcdef03'],
      [{ updatedAt: 'desc' }]
    )
  })

  it('treats an empty tagIds string as no filter', async () => {
    mockFindSocialProfilesInBounds.mockResolvedValue([])

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0', tagIds: '' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(mockFindSocialProfilesInBounds).toHaveBeenCalledWith(
      'profile-123',
      expect.any(Object),
      [],
      expect.any(Array)
    )
  })

  it('returns 400 when more than 5 tagIds are supplied', async () => {
    await handler()(
      {
        session: mockSession,
        query: {
          south: '45.0',
          north: '48.0',
          west: '16.0',
          east: '23.0',
          tagIds: 'cabcdef01,cabcdef02,cabcdef03,cabcdef04,cabcdef05,cabcdef06',
        },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(400)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 400 when a tagId fails the shape check', async () => {
    await handler()(
      {
        session: mockSession,
        query: {
          south: '45.0',
          north: '48.0',
          west: '16.0',
          east: '23.0',
          tagIds: "valid12345,'; DROP TABLE profile; --",
        },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(400)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 400 when bounds params are missing', async () => {
    await handler()({ session: mockSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(400)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 403 when social is not active', async () => {
    await handler()(
      {
        session: { ...mockSession, profile: { ...mockSession.profile, isSocialActive: false } },
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
      },
      reply
    )

    expect(reply.statusCode).toBe(403)
    expect(mockFindSocialProfilesInBounds).not.toHaveBeenCalled()
  })

  it('returns 500 on service error', async () => {
    mockFindSocialProfilesInBounds.mockRejectedValue(new Error('DB error'))

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
        log: { error: vi.fn() },
      },
      reply
    )

    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /dating/match-ids', () => {
  const handler = () => fastify.routes['GET /dating/match-ids']

  it('returns match IDs when dating is active', async () => {
    mockFindMutualMatchIds.mockResolvedValue(['p1', 'p2', 'p3'])
    const datingSession = {
      ...mockSession,
      profile: { ...mockSession.profile, isDatingActive: true },
    }

    await handler()({ session: datingSession, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, ids: ['p1', 'p2', 'p3'] })
    expect(mockFindMutualMatchIds).toHaveBeenCalledWith('profile-123')
  })

  it('returns empty array when dating is not active', async () => {
    await handler()({ session: mockSession, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, ids: [] })
    expect(mockFindMutualMatchIds).not.toHaveBeenCalled()
  })

  it('returns 500 on service error', async () => {
    mockFindMutualMatchIds.mockRejectedValue(new Error('DB error'))
    const datingSession = {
      ...mockSession,
      profile: { ...mockSession.profile, isDatingActive: true },
    }

    await handler()({ session: datingSession, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

// ────────────────────────────────────────────────────────────────────
// Deprecated SocialMatchFilter shim endpoints — kept for backwards
// compatibility with stale frontends that haven't been updated yet.
// See findProfile.route.ts for the cleanup TODO.
// ────────────────────────────────────────────────────────────────────
describe('GET /social/filter (deprecated shim)', () => {
  const handler = () => fastify.routes['GET /social/filter']

  it('returns a static empty SocialMatchFilterDTO', async () => {
    await handler()({ session: mockSession }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      filter: {
        location: { country: '' },
        radius: 50,
        tags: [],
      },
    })
  })
})

describe('PATCH /social/filter (deprecated shim)', () => {
  const handler = () => fastify.routes['PATCH /social/filter']

  it('ignores the request body and returns the same static DTO', async () => {
    await handler()(
      { session: mockSession, body: { location: { country: 'NL' }, tags: ['tag-x'] } },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      filter: {
        location: { country: '' },
        radius: 50,
        tags: [],
      },
    })
  })
})
