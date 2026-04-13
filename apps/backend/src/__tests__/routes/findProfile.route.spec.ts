import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFindMutualMatchIds = vi.fn()
const mockFindNewProfilesAnywhere = vi.fn()

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesInBounds: vi.fn(),
      findMutualMatchIds: mockFindMutualMatchIds,
      findNewProfilesAnywhere: mockFindNewProfilesAnywhere,
    }),
  },
}))

vi.mock('@/services/cluster.service', () => ({
  ClusterService: {
    getInstance: () => ({
      getOrBuildClusters: vi.fn().mockResolvedValue({ features: [], tags: [] }),
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

vi.mock('../../api/mappers/tag.mappers', () => ({
  mapProfileTagsTranslated: vi.fn((tags: any[]) =>
    tags.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug }))
  ),
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

// ────────────────────────────────────────────────────────────────────
// Deprecated shim — /social/map/bounds replaced by /social/map/clusters
// ────────────────────────────────────────────────────────────────────
describe('GET /social/map/bounds (deprecated shim)', () => {
  const handler = () => fastify.routes['GET /social/map/bounds']

  it('returns a static empty profiles array', async () => {
    await handler()({ session: mockSession }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, profiles: [] })
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
