import { describe, it, expect, beforeEach, vi } from 'vitest'
import findProfileRoutes from '../../api/routes/findProfile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockProfileService: any
let mockProfileMatchService: any

vi.mock('../../services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
}))
vi.mock('../../services/profileMatch.service', () => ({
  ProfileMatchService: { getInstance: () => mockProfileMatchService },
}))
vi.mock('../../api/mappers/profileMatch.mappers', () => ({
  mapSocialMatchFilterToDTO: vi.fn((filter) => ({
    location: {
      country: filter.country ?? '',
      cityName: filter.cityName ?? '',
      lat: filter.lat ?? null,
      lon: filter.lon ?? null,
    },
    tags: [],
    radius: filter.radius ?? 50,
  })),
  mapProfileToDatingPreferencesDTO: vi.fn(),
}))
vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileToPublic: vi.fn(),
}))
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
    RATE_LIMIT_PROFILE_SCOPES: 10,
  },
}))
vi.mock('@/utils/zodValidate', () => ({
  validateBody: vi.fn((_schema, req, _reply) => req.body),
}))

const makeReq = (overrides: any = {}) => ({
  user: { userId: 'u1' },
  session: {
    lang: 'en',
    profileId: 'p1',
    hasActiveProfile: true,
  },
  ...overrides,
})

beforeEach(async () => {
  mockProfileService = {
    getProfileById: vi.fn(),
  }
  mockProfileMatchService = {
    getSocialMatchFilter: vi.fn(),
    findSocialProfilesFor: vi.fn(),
    findNewProfilesAnywhere: vi.fn(),
  }
  fastify = new MockFastify()
  reply = new MockReply()
  await findProfileRoutes(fastify as any, {})
})

describe('GET /social/filter', () => {
  it('backfills cityName from profile when filter has country but no cityName', async () => {
    mockProfileMatchService.getSocialMatchFilter.mockResolvedValue({
      profileId: 'p1',
      country: 'HU',
      cityName: null,
      lat: null,
      lon: null,
      radius: 50,
      tags: [],
    })
    mockProfileService.getProfileById.mockResolvedValue({
      id: 'p1',
      country: 'HU',
      cityName: 'Budapest',
      lat: 47.497,
      lon: 19.04,
    })

    await fastify.routes['GET /social/filter'](makeReq(), reply)

    expect(mockProfileService.getProfileById).toHaveBeenCalledWith('p1')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.filter.location).toEqual({
      country: 'HU',
      cityName: 'Budapest',
      lat: 47.497,
      lon: 19.04,
    })
  })

  it('does not backfill when filter already has cityName', async () => {
    mockProfileMatchService.getSocialMatchFilter.mockResolvedValue({
      profileId: 'p1',
      country: 'HU',
      cityName: 'Debrecen',
      lat: 47.531,
      lon: 21.625,
      radius: 50,
      tags: [],
    })

    await fastify.routes['GET /social/filter'](makeReq(), reply)

    expect(mockProfileService.getProfileById).not.toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.filter.location.cityName).toBe('Debrecen')
  })

  it('does not backfill when filter has no country (Anywhere)', async () => {
    mockProfileMatchService.getSocialMatchFilter.mockResolvedValue({
      profileId: 'p1',
      country: '',
      cityName: null,
      lat: null,
      lon: null,
      radius: 50,
      tags: [],
    })

    await fastify.routes['GET /social/filter'](makeReq(), reply)

    expect(mockProfileService.getProfileById).not.toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
  })
})
