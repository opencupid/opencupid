import { describe, it, expect, beforeEach, vi } from 'vitest'
import profileRoutes from '../../api/routes/profile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockProfileService: any
let mockProfileMatchService: any
let mockMessageService: any

vi.mock('../../services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
}))
vi.mock('../../services/profileMatch.service', () => ({
  ProfileMatchService: { getInstance: () => mockProfileMatchService },
}))
vi.mock('../../services/messaging.service', () => ({
  MessageService: { getInstance: () => mockMessageService },
}))
vi.mock('../../api/mappers/profile.mappers', () => ({
  mapDbProfileToOwnerProfile: vi.fn((_locale, db) => ({
    id: db.id,
    publicName: db.publicName || 'mapped',
    location: {
      country: db.country || '',
      cityName: db.cityName || '',
      lat: db.lat ?? null,
      lon: db.lon ?? null,
    },
  })),
  mapProfileSummary: vi.fn((p) => ({
    id: p.id,
    publicName: p.publicName,
    profileImages: p.profileImages,
  })),
  mapProfileWithContext: vi.fn((db, _dating, _locale) => ({
    id: db.id,
    publicName: db.publicName || 'mapped',
  })),
  mapProfileToPublic: vi.fn((db, _dating, _locale) => ({
    id: db.id,
    publicName: db.publicName || 'mapped',
  })),
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
    profile: { isDatingActive: true },
  },
  deleteSession: vi.fn(),
  ...overrides,
})

beforeEach(async () => {
  fastify = new MockFastify()
  const mockTx = { profile: { count: vi.fn().mockResolvedValue(0) } }
  fastify.prisma = { $transaction: vi.fn((fn: any) => fn(mockTx)) }
  reply = new MockReply()
  mockProfileService = {
    getProfileCompleteByUserId: vi.fn(),
    getProfileCompleteById: vi.fn(),
    getProfileWithContextById: vi.fn(),
    getProfileByUserId: vi.fn(),
    updateCompleteProfile: vi.fn(),
    updateScopes: vi.fn(),
    blockProfile: vi.fn(),
    unblockProfile: vi.fn(),
    getBlockedProfiles: vi.fn(),
  }
  mockProfileMatchService = {
    areProfilesMutuallyCompatible: vi.fn().mockResolvedValue(false),
    createSocialMatchFilter: vi.fn(),
    createDatingPrefsDefaults: vi.fn().mockReturnValue({}),
  }
  mockMessageService = {
    sendWelcomeMessage: vi.fn(),
  }
  await profileRoutes(fastify as any, {})
})

describe('GET /me', () => {
  it('returns 200 with owner profile', async () => {
    const handler = fastify.routes['GET /me']
    const dbProfile = { id: 'p1', publicName: 'Alice', tags: [], profileImages: [], localized: [] }
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue(dbProfile)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profile).toBeDefined()
  })

  it('returns 404 when profile not found', async () => {
    const handler = fastify.routes['GET /me']
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue(null)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('returns 500 on service error', async () => {
    const handler = fastify.routes['GET /me']
    mockProfileService.getProfileCompleteByUserId.mockRejectedValue(new Error('db fail'))

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /:id', () => {
  it('returns 200 with public profile', async () => {
    const handler = fastify.routes['GET /:id']
    const dbProfile = {
      id: 'p2',
      userId: 'u2',
      publicName: 'Bob',
      blockedProfiles: [],
      isDatingActive: false,
      conversationParticipants: [],
    }
    mockProfileService.getProfileWithContextById.mockResolvedValue(dbProfile)

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
  })

  it('returns 404 when profile not found', async () => {
    const handler = fastify.routes['GET /:id']
    mockProfileService.getProfileWithContextById.mockResolvedValue(null)

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('returns 404 when profile is blocked', async () => {
    const handler = fastify.routes['GET /:id']
    const dbProfile = {
      id: 'p2',
      userId: 'u2',
      blockedProfiles: [{ id: 'p1' }],
    }
    mockProfileService.getProfileWithContextById.mockResolvedValue(dbProfile)

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('returns 403 when viewer has no active profile and is not the owner', async () => {
    const handler = fastify.routes['GET /:id']
    const dbProfile = {
      id: 'p2',
      userId: 'u2',
      blockedProfiles: [],
      isDatingActive: false,
    }
    mockProfileService.getProfileWithContextById.mockResolvedValue(dbProfile)

    const req = makeReq({
      params: { id: 'cm000000000000000000000p2' },
      session: {
        lang: 'en',
        profileId: 'p1',
        hasActiveProfile: false,
        profile: { isDatingActive: false },
      },
    })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(403)
  })
})

describe('POST /:id/block', () => {
  it('blocks a profile successfully', async () => {
    const handler = fastify.routes['POST /:id/block']
    mockProfileService.blockProfile.mockResolvedValue({})

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(204)
    expect(mockProfileService.blockProfile).toHaveBeenCalledWith('p1', 'cm000000000000000000000p2')
  })

  it('returns 400 when trying to block yourself', async () => {
    const handler = fastify.routes['POST /:id/block']
    const myProfileId = 'cm000000000000000000000p1'

    const req = makeReq({
      params: { id: myProfileId },
      session: { lang: 'en', profileId: myProfileId, hasActiveProfile: true, profile: {} },
    })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(400)
  })
})

describe('POST /:id/unblock', () => {
  it('unblocks a profile', async () => {
    const handler = fastify.routes['POST /:id/unblock']
    mockProfileService.unblockProfile.mockResolvedValue({})

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(204)
  })
})

describe('GET /blocked', () => {
  it('returns blocked profiles list', async () => {
    const handler = fastify.routes['GET /blocked']
    mockProfileService.getBlockedProfiles.mockResolvedValue([
      { id: 'p2', publicName: 'Bob', profileImages: [] },
    ])

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
  })
})

describe('PATCH /me', () => {
  it('updates profile and returns 200', async () => {
    const handler = fastify.routes['PATCH /me']
    const updatedDb = {
      id: 'p1',
      publicName: 'Updated',
      tags: [],
      profileImages: [],
      localized: [],
    }
    mockProfileService.updateCompleteProfile.mockResolvedValue(updatedDb)

    const req = makeReq({ body: { publicName: 'Updated' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
  })
})

describe('PATCH /scopes', () => {
  it('updates scopes and clears session', async () => {
    const handler = fastify.routes['PATCH /scopes']
    const updatedDb = { id: 'p1', isDatingActive: true, tags: [], profileImages: [], localized: [] }
    mockProfileService.updateScopes.mockResolvedValue(updatedDb)

    const req = makeReq({ body: { isDatingActive: true } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(req.deleteSession).toHaveBeenCalled()
  })

  it('returns 404 when profile not found', async () => {
    const handler = fastify.routes['PATCH /scopes']
    mockProfileService.updateScopes.mockResolvedValue(null)

    const req = makeReq({ body: { isDatingActive: true } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(404)
  })
})

describe('POST /me (onboarding)', () => {
  const dbProfile = {
    id: 'p1',
    publicName: 'Test',
    country: 'HU',
    cityName: 'Budapest',
    lat: 47.497,
    lon: 19.04,
    tags: [],
    profileImages: [],
    localized: [],
  }

  it('creates filter with full location when nearby members exist', async () => {
    const handler = fastify.routes['POST /me']
    const mockTx = { profile: { count: vi.fn().mockResolvedValue(5) } }
    fastify.prisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
    mockProfileService.updateCompleteProfile.mockResolvedValue(dbProfile)

    const req = makeReq({ body: { publicName: 'Test', country: 'HU' } })
    await handler(req, reply as any)

    expect(mockTx.profile.count).toHaveBeenCalledWith({
      where: {
        country: 'HU',
        isSocialActive: true,
        isOnboarded: true,
        isActive: true,
        id: { not: 'p1' },
      },
    })
    expect(mockProfileMatchService.createSocialMatchFilter).toHaveBeenCalledWith(
      mockTx,
      'p1',
      expect.objectContaining({ country: 'HU', cityName: 'Budapest', lat: 47.497, lon: 19.04 })
    )
  })

  it('creates filter with Anywhere when no nearby members', async () => {
    const handler = fastify.routes['POST /me']
    const mockTx = { profile: { count: vi.fn().mockResolvedValue(0) } }
    fastify.prisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
    mockProfileService.updateCompleteProfile.mockResolvedValue(dbProfile)

    const req = makeReq({ body: { publicName: 'Test', country: 'HU' } })
    await handler(req, reply as any)

    expect(mockProfileMatchService.createSocialMatchFilter).toHaveBeenCalledWith(
      mockTx,
      'p1',
      expect.objectContaining({ country: '', cityName: '', lat: null, lon: null })
    )
  })
})
