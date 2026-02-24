import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFindSocialProfilesWithLocation = vi.fn()
const mockFindSocialProfilesFor = vi.fn()

vi.mock('@/services/profileMatch.service', () => ({
  ProfileMatchService: {
    getInstance: () => ({
      findSocialProfilesFor: mockFindSocialProfilesFor,
      findSocialProfilesWithLocation: mockFindSocialProfilesWithLocation,
      getSocialMatchFilter: vi.fn(),
      updateSocialMatchFilter: vi.fn(),
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

describe('GET /social/map', () => {
  const handler = () => fastify.routes['GET /social/map']

  it('returns profiles with location data', async () => {
    const mockProfiles = [
      {
        id: 'p1',
        publicName: 'Alice',
        lat: 47.5,
        lon: 19.0,
        country: 'HU',
        cityName: 'Budapest',
        localized: [],
        profileImages: [],
        tags: [],
      },
    ]
    mockFindSocialProfilesWithLocation.mockResolvedValue(mockProfiles)

    await handler()({ session: mockSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
    expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith(
      'profile-123',
      [{ updatedAt: 'desc' }],
      undefined
    )
  })

  it('passes bounding box to service when provided', async () => {
    mockFindSocialProfilesWithLocation.mockResolvedValue([])

    await handler()(
      {
        session: mockSession,
        query: { south: '45.0', north: '48.0', west: '16.0', east: '23.0' },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith(
      'profile-123',
      [{ updatedAt: 'desc' }],
      { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }
    )
  })

  it('returns 403 when social is not active', async () => {
    await handler()(
      {
        session: { ...mockSession, profile: { ...mockSession.profile, isSocialActive: false } },
        query: {},
      },
      reply
    )

    expect(reply.statusCode).toBe(403)
    expect(mockFindSocialProfilesWithLocation).not.toHaveBeenCalled()
  })

  it('returns 500 on service error', async () => {
    mockFindSocialProfilesWithLocation.mockRejectedValue(new Error('DB error'))

    await handler()({ session: mockSession, query: {}, log: { error: vi.fn() } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})
