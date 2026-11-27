import { describe, it, expect, beforeEach, vi } from 'vitest'
import profileRoutes from '../../api/routes/profile.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import { mapProfileToPublic } from '../../api/mappers/profile.mappers'

let fastify: MockFastify
let reply: MockReply
let mockProfileService: any
let mockProfileMatchService: any
let mockMessageService: any
let mockClusterService: any

vi.mock('../../services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
}))
vi.mock('../../services/cluster.service', () => ({
  ClusterService: { getInstance: () => mockClusterService },
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
    isActive: db.isActive ?? false,
    isDatingActive: db.isDatingActive ?? false,
    isSocialActive: db.isSocialActive ?? false,
    isOnboarded: db.isOnboarded ?? false,
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
    profileImages: (p.profileImages ?? []).map((g: any) => g.image),
    location: p.location ?? { country: '' },
  })),
  mapProfileToPublic: vi.fn((db, _dating, _locale) => ({
    id: db.id,
    publicName: db.publicName || 'mapped',
  })),
}))
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
    NODE_ENV: 'development',
    brands: [{ domain: 'localhost', siteName: 'Test' }],
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
  updateSession: vi.fn(),
  replaceSession: vi.fn().mockResolvedValue(true),
  ...overrides,
})

beforeEach(async () => {
  fastify = new MockFastify()
  const mockTx = {
    pushSubscription: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  }
  fastify.prisma = { $transaction: vi.fn((fn: any) => fn(mockTx)) }
  reply = new MockReply()
  mockProfileService = {
    getProfileCompleteByUserId: vi.fn(),
    getProfileCompleteById: vi.fn(),
    getProfilePublicById: vi.fn(),
    getProfileByUserId: vi.fn(),
    updateCompleteProfile: vi.fn(),
    updateProfileScalars: vi.fn(),
    getOptInSettingsByProfileId: vi.fn(),
    updateOptInSettingsByUserId: vi.fn(),
    updateScopes: vi.fn(),
    blockProfile: vi.fn(),
    unblockProfile: vi.fn(),
    getBlockedProfiles: vi.fn(),
  }
  mockProfileMatchService = {
    areProfilesMutuallyCompatible: vi.fn().mockResolvedValue(false),
    createDatingPrefsDefaults: vi.fn().mockReturnValue({}),
  }
  mockMessageService = {
    sendWelcomeMessage: vi.fn(),
  }
  mockClusterService = {
    evict: vi.fn(),
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

describe('GET /me with a pending JWT', () => {
  const dbProfile = { id: 'p1', isActive: true, isDatingActive: false, isSocialActive: true }
  const pendingReq = () =>
    makeReq({
      user: { userId: 'u1', pending: true },
      session: {
        userId: 'u1',
        profileId: 'p1',
        tokenVersion: 3,
        lang: 'hu',
        roles: [],
        hasActiveProfile: false,
        profile: { id: 'p1', isDatingActive: false, isSocialActive: false, isActive: false },
      },
    })

  it('replaces the JWT and brings the session up to date once the user has onboarded elsewhere', async () => {
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue({
      ...dbProfile,
      isOnboarded: true,
    })

    const req = pendingReq()
    await fastify.routes['GET /me'](req, reply as any)

    const jwt = JSON.stringify({ userId: 'u1', profileId: 'p1', tokenVersion: 3 })
    expect(reply.cookies.map(({ name, value }) => [name, value])).toEqual([['__session', jwt]])
    expect(req.replaceSession).toHaveBeenCalledWith(jwt)
    expect(req.updateSession).toHaveBeenCalledWith({
      hasActiveProfile: true,
      profile: { id: 'p1', isDatingActive: false, isSocialActive: true, isActive: true },
    })
    // The replacement copies the session, so it has to be up to date by then
    expect(req.updateSession.mock.invocationCallOrder[0]).toBeLessThan(
      req.replaceSession.mock.invocationCallOrder[0]!
    )
    expect(reply.statusCode).toBe(200)
  })

  it('sets no cookie when the session was revoked meanwhile', async () => {
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue({
      ...dbProfile,
      isOnboarded: true,
    })
    const req = pendingReq()
    req.replaceSession.mockResolvedValue(false)

    await fastify.routes['GET /me'](req, reply as any)

    expect(reply.cookies).toEqual([])
  })

  it('keeps the JWT while the user has not onboarded', async () => {
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue({
      ...dbProfile,
      isOnboarded: false,
    })

    const req = pendingReq()
    await fastify.routes['GET /me'](req, reply as any)

    expect(reply.cookies).toEqual([])
    expect(req.replaceSession).not.toHaveBeenCalled()
  })

  it('keeps a JWT that is not pending', async () => {
    mockProfileService.getProfileCompleteByUserId.mockResolvedValue({
      ...dbProfile,
      isOnboarded: true,
    })
    const req = makeReq()

    await fastify.routes['GET /me'](req, reply as any)

    expect(reply.cookies).toEqual([])
    expect(req.updateSession).not.toHaveBeenCalled()
    expect(req.replaceSession).not.toHaveBeenCalled()
  })
})

describe('GET /me/optin', () => {
  it('returns 200 with opt-in settings', async () => {
    const handler = fastify.routes['GET /me/optin']
    mockProfileService.getOptInSettingsByProfileId.mockResolvedValue({
      isCallable: false,
      isPushNotificationEnabled: true,
      emailPreferences: { notifications: true, reminders: true, newsletter: false },
    })

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.optIn).toEqual({
      isCallable: false,
      isPushNotificationEnabled: true,
      emailPreferences: { notifications: true, reminders: true, newsletter: false },
    })
  })

  it('returns 404 when profile is not found', async () => {
    const handler = fastify.routes['GET /me/optin']
    mockProfileService.getOptInSettingsByProfileId.mockResolvedValue(null)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(404)
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
    mockProfileService.getProfilePublicById.mockResolvedValue(dbProfile)

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
  })

  it('returns 404 when profile not found', async () => {
    const handler = fastify.routes['GET /:id']
    mockProfileService.getProfilePublicById.mockResolvedValue(null)

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
    mockProfileService.getProfilePublicById.mockResolvedValue(dbProfile)

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
    mockProfileService.getProfilePublicById.mockResolvedValue(dbProfile)

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

describe('GET /:id restricted images', () => {
  const target = {
    id: 'p2',
    userId: 'u2',
    publicName: 'Bob',
    blockedProfiles: [],
    isDatingActive: true,
  }
  const req = (viewerDating: boolean) =>
    makeReq({
      params: { id: 'cm000000000000000000000p2' },
      session: {
        lang: 'en',
        profileId: 'p1',
        hasActiveProfile: true,
        profile: { isDatingActive: viewerDating },
      },
    })

  it('loads restricted images so the mapper can apply the viewer rule', async () => {
    mockProfileService.getProfilePublicById.mockResolvedValue(target)
    await fastify.routes['GET /:id'](req(true), reply as any)
    expect(mockProfileService.getProfilePublicById).toHaveBeenCalledWith(
      'cm000000000000000000000p2',
      'p1',
      { includeRestricted: true }
    )
  })

  it('grants them only to a mutually compatible dating viewer', async () => {
    mockProfileService.getProfilePublicById.mockResolvedValue(target)
    mockProfileMatchService.areProfilesMutuallyCompatible.mockResolvedValue(true)
    await fastify.routes['GET /:id'](req(true), reply as any)
    expect(mapProfileToPublic).toHaveBeenLastCalledWith(target, true, 'en')
  })

  it('withholds them when preferences do not match', async () => {
    mockProfileService.getProfilePublicById.mockResolvedValue(target)
    mockProfileMatchService.areProfilesMutuallyCompatible.mockResolvedValue(false)
    await fastify.routes['GET /:id'](req(true), reply as any)
    expect(mapProfileToPublic).toHaveBeenLastCalledWith(target, false, 'en')
  })

  it('withholds them from a viewer who is not dating', async () => {
    mockProfileService.getProfilePublicById.mockResolvedValue(target)
    mockProfileMatchService.areProfilesMutuallyCompatible.mockResolvedValue(true)
    await fastify.routes['GET /:id'](req(false), reply as any)
    expect(mapProfileToPublic).toHaveBeenLastCalledWith(target, false, 'en')
    expect(mockProfileMatchService.areProfilesMutuallyCompatible).not.toHaveBeenCalled()
  })
})

describe('GET /preview/:locale/:id', () => {
  const ownId = 'cm000000000000000000000p1'
  const own = { id: ownId, publicName: 'Alice' }
  const req = (scope?: string) =>
    makeReq({
      params: { id: ownId, locale: 'hu' },
      query: scope ? { scope } : {},
      session: { lang: 'en', profileId: ownId, hasActiveProfile: true, profile: {} },
    })

  it.each([
    ['dating', true],
    ['social', false],
  ])('renders the %s scope with the matching image rule', async (scope, dating) => {
    mockProfileService.getProfileCompleteById.mockResolvedValue(own)
    await fastify.routes['GET /preview/:locale/:id'](req(scope), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(mapProfileToPublic).toHaveBeenLastCalledWith(own, dating, 'hu')
  })

  it.each([[undefined], ['everyone']])('rejects scope %s with 400', async (scope) => {
    mockProfileService.getProfileCompleteById.mockResolvedValue(own)
    await fastify.routes['GET /preview/:locale/:id'](req(scope), reply as any)
    expect(reply.statusCode).toBe(400)
    expect(mockProfileService.getProfileCompleteById).not.toHaveBeenCalled()
  })
})

describe('POST /:id/block', () => {
  it('blocks a profile successfully and evicts cluster cache', async () => {
    const handler = fastify.routes['POST /:id/block']
    mockProfileService.blockProfile.mockResolvedValue({})

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(204)
    expect(mockProfileService.blockProfile).toHaveBeenCalledWith('p1', 'cm000000000000000000000p2')
    // Both sides' cached indexes: the blocked profile must stop seeing the blocker too.
    expect(mockClusterService.evict).toHaveBeenCalledWith('p1')
    expect(mockClusterService.evict).toHaveBeenCalledWith('cm000000000000000000000p2')
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
  it('unblocks a profile and evicts cluster cache', async () => {
    const handler = fastify.routes['POST /:id/unblock']
    mockProfileService.unblockProfile.mockResolvedValue({})

    const req = makeReq({ params: { id: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(204)
    expect(mockClusterService.evict).toHaveBeenCalledWith('p1')
    expect(mockClusterService.evict).toHaveBeenCalledWith('cm000000000000000000000p2')
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

describe('PATCH /me/dating-prefs', () => {
  const body = { prefAgeMin: 30, prefAgeMax: 40, prefGender: ['female'], prefKids: [] }

  it('updates prefs and evicts the cluster cache', async () => {
    const handler = fastify.routes['PATCH /me/dating-prefs']
    mockProfileService.updateProfileScalars.mockResolvedValue({ id: 'p1', ...body })

    await handler(makeReq({ body }), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.prefs).toMatchObject(body)
    expect(mockClusterService.evict).toHaveBeenCalledWith('p1')
  })

  it('does not evict when the profile is missing', async () => {
    const handler = fastify.routes['PATCH /me/dating-prefs']
    mockProfileService.updateProfileScalars.mockResolvedValue(null)

    await handler(makeReq({ body }), reply as any)
    expect(reply.statusCode).toBe(404)
    expect(mockClusterService.evict).not.toHaveBeenCalled()
  })
})

describe('PATCH /me', () => {
  it('updates profile and returns 200, evicts cluster cache', async () => {
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
    expect(mockClusterService.evict).toHaveBeenCalledWith('p1')
  })
})

describe('PATCH /me/optin', () => {
  it('updates opt-in settings and returns 200', async () => {
    const handler = fastify.routes['PATCH /me/optin']
    mockProfileService.updateOptInSettingsByUserId.mockResolvedValue({
      isCallable: true,
      isPushNotificationEnabled: true,
      emailPreferences: { notifications: true, reminders: true, newsletter: false },
    })

    const body = { isCallable: true, emailPreferences: { newsletter: false } }
    const req = makeReq({ body })
    await handler(req, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockProfileService.updateOptInSettingsByUserId).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      body
    )
  })

  it('clears push subscriptions when push is disabled', async () => {
    const handler = fastify.routes['PATCH /me/optin']
    const tx = {
      pushSubscription: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    fastify.prisma.$transaction.mockImplementation(async (fn: any) => fn(tx))
    mockProfileService.updateOptInSettingsByUserId.mockResolvedValue({
      isCallable: true,
      isPushNotificationEnabled: false,
      emailPreferences: { notifications: true, reminders: true, newsletter: false },
    })

    const req = makeReq({ body: { isPushNotificationEnabled: false } })
    await handler(req, reply as any)

    expect(tx.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(reply.statusCode).toBe(200)
  })
})

describe('PATCH /scopes', () => {
  it('updates scopes and updates session with new profile data', async () => {
    const handler = fastify.routes['PATCH /scopes']
    const updatedDb = {
      id: 'p1',
      isDatingActive: true,
      isSocialActive: true,
      isActive: true,
    }
    mockProfileService.updateScopes.mockResolvedValue(updatedDb)

    const req = makeReq({ body: { isDatingActive: true } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      isDatingActive: true,
      isActive: true,
    })
    expect(req.updateSession).toHaveBeenCalledWith({
      hasActiveProfile: true,
      profile: {
        id: 'p1',
        isDatingActive: true,
        isSocialActive: true,
        isActive: true,
      },
    })
    expect(mockClusterService.evict).toHaveBeenCalledWith('p1')
  })

  it('returns 404 when profile not found', async () => {
    const handler = fastify.routes['PATCH /scopes']
    mockProfileService.updateScopes.mockResolvedValue(null)

    const req = makeReq({ body: { isDatingActive: true } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('does not evict when updateSession throws', async () => {
    const handler = fastify.routes['PATCH /scopes']
    const updatedDb = {
      id: 'p1',
      isDatingActive: true,
      isSocialActive: true,
      isActive: true,
    }
    mockProfileService.updateScopes.mockResolvedValue(updatedDb)
    const req = makeReq({ body: { isDatingActive: true } })
    req.updateSession = vi.fn().mockRejectedValue(new Error('session failure'))

    await handler(req, reply as any)

    expect(mockClusterService.evict).not.toHaveBeenCalled()
    expect(reply.statusCode).toBe(500)
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

  it('updates session with active profile state instead of deleting it', async () => {
    const handler = fastify.routes['POST /me']
    const profile = {
      ...dbProfile,
      isActive: true,
      isDatingActive: true,
      isSocialActive: false,
    }
    mockProfileService.updateCompleteProfile.mockResolvedValue(profile)

    const req = makeReq({ body: { publicName: 'Test', country: 'HU' } })
    await handler(req, reply as any)

    expect(req.deleteSession).not.toHaveBeenCalled()
    expect(req.updateSession).toHaveBeenCalledWith({
      hasActiveProfile: true,
      profile: {
        id: 'p1',
        isDatingActive: true,
        isSocialActive: false,
        isActive: true,
      },
    })
  })

  it('replaces a pending JWT, leaving the old session to in-flight requests', async () => {
    mockProfileService.updateCompleteProfile.mockResolvedValue({
      ...dbProfile,
      isActive: true,
      isSocialActive: true,
      isOnboarded: true,
    })
    const req = makeReq({
      body: { publicName: 'Test', country: 'HU' },
      user: { userId: 'u1', pending: true },
      session: { userId: 'u1', profileId: 'p1', tokenVersion: 0, lang: 'en', roles: [] },
    })

    await fastify.routes['POST /me'](req, reply as any)

    const jwt = JSON.stringify({ userId: 'u1', profileId: 'p1', tokenVersion: 0 })
    expect(reply.cookies.map(({ name, value }) => [name, value])).toEqual([['__session', jwt]])
    expect(req.replaceSession).toHaveBeenCalledWith(jwt)
    expect(req.deleteSession).not.toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
  })
})
