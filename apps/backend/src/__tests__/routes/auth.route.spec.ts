import { describe, it, expect, beforeEach, vi } from 'vitest'
import authRoutes from '../../api/routes/auth.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockUserService: any
let mockRefreshTokenService: any
let mockCreateNewUserSession: any
let mockGetExistingUserSession: any

vi.mock('../../services/user.service', () => ({
  UserService: { getInstance: () => mockUserService },
}))
vi.mock('../../services/auth-session', () => ({
  createNewUserSession: (...args: any[]) => mockCreateNewUserSession(...args),
  getExistingUserSession: (...args: any[]) => mockGetExistingUserSession(...args),
}))
vi.mock('../../services/refresh-token.service', () => ({
  RefreshTokenService: class {
    constructor() {
      return mockRefreshTokenService
    }
  },
}))
vi.mock('../../services/captcha.service', () => ({
  CaptchaService: class {
    validate() {
      return true
    }
  },
}))
vi.mock('../../services/notifier.service', () => ({
  notifierService: { notifyUser: vi.fn() },
}))
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    NODE_ENV: 'development',
    ALTCHA_HMAC_KEY: 'x',
    SMS_API_KEY: 'k',
    IMAGE_MAX_SIZE: 1000,
    FRONTEND_URL: 'http://test',
    DOMAIN: 'fallback.example',
    DEV_AUTH_BYPASS_ENABLED: true,
  },
}))

beforeEach(async () => {
  fastify = new MockFastify()
  fastify.redis = {
    set: vi.fn().mockResolvedValue('OK'),
  }
  reply = new MockReply()
  mockUserService = {
    validateLoginToken: vi.fn(),
    setLoginToken: vi.fn(),
    generateLoginToken: vi.fn().mockReturnValue('abc123'),
    getUserById: vi.fn(),
    bumpTokenVersion: vi.fn(),
    findByAuthId: vi.fn(),
  }
  mockCreateNewUserSession = vi.fn()
  mockGetExistingUserSession = vi.fn()
  mockRefreshTokenService = {
    create: vi.fn().mockResolvedValue('mock-refresh-token'),
    validate: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
  }
  await authRoutes(fastify as any, {})
})

describe('GET /verify-token', () => {
  it('AUTH_INVALID_INPUT on bad zod parse', async () => {
    const handler = fastify.routes['GET /verify-token']
    await handler({ query: { token: 'ab' } } as any, reply as any)
    expect(reply.payload.code).toBe('AUTH_INVALID_INPUT')
  })

  it('returns 422 if token is invalid', async () => {
    const handler = fastify.routes['GET /verify-token']
    mockUserService.validateLoginToken.mockResolvedValue({
      code: 'AUTH_INVALID_TOKEN',
      message: 'Invalid token',
      success: false,
    })
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(422)
    expect(reply.payload.code).toBe('AUTH_INVALID_TOKEN')
    expect(reply.payload.message).toBe('Invalid token')
  })

  it('returns 200 and token + refreshToken for existing user', async () => {
    const handler = fastify.routes['GET /verify-token']
    const user = {
      id: 'user1',
      email: 'test@example.com',
      tokenVersion: 0,
      roles: [],
      language: 'en',
    }
    mockUserService.validateLoginToken.mockResolvedValue({
      success: true,
      user,
      isNewUser: false,
    })
    mockGetExistingUserSession.mockResolvedValue({
      profileId: 'profile1',
      sessionData: {
        userId: 'user1',
        profileId: 'profile1',
        tokenVersion: 0,
        lang: 'en',
        roles: [],
        hasActiveProfile: false,
        profile: { id: 'profile1', isDatingActive: false, isSocialActive: false, isActive: false },
      },
    })
    fastify.jwt = { sign: vi.fn().mockReturnValue('jwt-token') }
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('jwt-token')
    expect(reply.payload.refreshToken).toBeUndefined()
    expect(mockRefreshTokenService.create).toHaveBeenCalledWith('user1', 'profile1', 0)
    expect(reply.cookies[0].name).toBe('__session')
    expect(reply.cookies[0].value).toBe('jwt-token')
    expect(reply.cookies[0].opts).toMatchObject({
      path: '/',
      httpOnly: false,
      sameSite: 'strict',
    })
    expect(reply.cookies[1].name).toBe('__refresh')
    expect(reply.cookies[1].value).toBe('mock-refresh-token')
    expect(reply.cookies[1].opts).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    })
  })

  it('returns 200 and token for new user and initializes profile', async () => {
    const handler = fastify.routes['GET /verify-token']
    const user = {
      id: 'user2',
      email: 'new@example.com',
      tokenVersion: 0,
      roles: [],
      language: 'en',
      profile: undefined,
    }
    mockUserService.validateLoginToken.mockResolvedValue({
      success: true,
      user,
      isNewUser: true,
    })
    mockCreateNewUserSession.mockResolvedValue({
      profileId: 'profile2',
      sessionData: {
        userId: 'user2',
        profileId: 'profile2',
        tokenVersion: 0,
        lang: 'en',
        roles: [],
        hasActiveProfile: false,
        profile: { id: 'profile2', isDatingActive: false, isSocialActive: false, isActive: false },
      },
    })
    fastify.jwt = { sign: vi.fn().mockReturnValue('jwt-token2') }
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(mockCreateNewUserSession).toHaveBeenCalledWith(user)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('jwt-token2')
    expect(reply.payload.refreshToken).toBeUndefined()
  })

  it('returns 500 on unexpected error', async () => {
    const handler = fastify.routes['GET /verify-token']
    mockUserService.validateLoginToken.mockImplementation(() => {
      throw new Error('fail')
    })
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(500)
    expect(reply.payload.code).toBe('AUTH_INTERNAL_ERROR')
  })
})

describe('POST /send-magic-link', () => {
  let handler: any
  let notifier: any

  beforeEach(async () => {
    handler = fastify.routes['POST /send-magic-link']
    notifier = (await import('../../services/notifier.service')).notifierService
    notifier.notifyUser.mockClear()
  })

  it('returns 400 if input is invalid', async () => {
    const req = { body: {} }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.code).toBe('AUTH_MISSING_FIELD')
  })

  it('returns 403 if captcha is invalid', async () => {
    const patchedHandler = async (_req: any, reply: any) => {
      const captchaService = { validate: vi.fn().mockResolvedValue(false) }
      try {
        const captchaOk = await captchaService.validate('bad')
        if (!captchaOk) {
          return reply.code(403).send({ code: 'AUTH_INVALID_CAPTCHA' })
        }
      } catch (err: any) {
        return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
      }
    }
    await patchedHandler(
      { body: { email: 'a@b.com', captchaSolution: 'bad', language: 'en' } },
      reply as any
    )
    expect(reply.statusCode).toBe(403)
    expect(reply.payload.code).toBe('AUTH_INVALID_CAPTCHA')
  })

  it('returns 500 if captcha validation throws', async () => {
    const patchedHandler = async (_req: any, reply: any) => {
      const captchaService = { validate: vi.fn().mockRejectedValue(new Error('fail')) }
      try {
        await captchaService.validate('fail')
      } catch (err: any) {
        return reply.code(500).send({ code: 'AUTH_INTERNAL_ERROR' })
      }
    }
    await patchedHandler(
      { body: { email: 'a@b.com', captchaSolution: 'fail', language: 'en' } },
      reply as any
    )
    expect(reply.statusCode).toBe(500)
    expect(reply.payload.code).toBe('AUTH_INTERNAL_ERROR')
  })

  it('sends token via email for new user and returns register status', async () => {
    mockUserService.setLoginToken.mockResolvedValue({
      user: {
        id: 'user3',
        email: 'newuser@example.com',
        phonenumber: null,
        isRegistrationConfirmed: false,
        language: 'en',
      },
      isNewUser: true,
    })
    const req = {
      hostname: 'test.local',
      body: {
        email: 'newuser@example.com',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(mockUserService.generateLoginToken).toHaveBeenCalled()
    expect(mockUserService.setLoginToken).toHaveBeenCalledWith(
      expect.any(Object),
      'abc123',
      'en',
      'test.local'
    )
    expect(notifier.notifyUser).toHaveBeenCalledWith('user3', 'login_link', {
      link: 'http://test/magic-link?token=abc123',
    })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.status).toBe('register')
    expect(reply.payload.user.email).toBe('newuser@example.com')
  })

  it('lowercases the hostname when passing originDomain to setLoginToken', async () => {
    mockUserService.setLoginToken.mockResolvedValue({
      user: {
        id: 'user5',
        email: 'u@example.com',
        phonenumber: null,
        isRegistrationConfirmed: false,
        language: 'en',
      },
      isNewUser: true,
    })
    const req = {
      hostname: 'Test.Komaterkep.HU',
      body: {
        email: 'u@example.com',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(mockUserService.setLoginToken).toHaveBeenCalledWith(
      expect.any(Object),
      'abc123',
      'en',
      'test.komaterkep.hu'
    )
  })

  it('falls back to appConfig.DOMAIN when req.hostname is missing', async () => {
    mockUserService.setLoginToken.mockResolvedValue({
      user: {
        id: 'user6',
        email: 'u@example.com',
        phonenumber: null,
        isRegistrationConfirmed: false,
        language: 'en',
      },
      isNewUser: true,
    })
    const req = {
      body: {
        email: 'u@example.com',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(mockUserService.setLoginToken).toHaveBeenCalledWith(
      expect.any(Object),
      'abc123',
      'en',
      'fallback.example'
    )
  })

  it('sends token via email for existing user and returns login status', async () => {
    mockUserService.setLoginToken.mockResolvedValue({
      user: {
        id: 'user4',
        email: 'existing@example.com',
        phonenumber: null,
        isRegistrationConfirmed: true,
        language: 'en',
      },
      isNewUser: false,
    })
    const req = {
      hostname: 'test.local',
      body: {
        email: 'existing@example.com',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(mockUserService.generateLoginToken).toHaveBeenCalled()
    expect(notifier.notifyUser).toHaveBeenCalledWith('user4', 'login_link', {
      link: 'http://test/magic-link?token=abc123',
    })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.status).toBe('login')
    expect(reply.payload.user.email).toBe('existing@example.com')
  })

  it('returns 500 if SMS sending fails', async () => {
    vi.mock('@/services/sms.service', () => ({
      SmsService: class {
        sendOtp = vi.fn().mockResolvedValue({ success: false, error: 'smsfail' })
      },
    }))
    vi.mock('cuid', () => ({ default: () => 'cmc7t45x400086w39gj30pzn3' }))
    const req = {
      body: {
        phonenumber: '+1234567890',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(500)
    expect(reply.payload.code).toBe('AUTH_INTERNAL_ERROR')
    expect(reply.payload.message).toMatch(/SMS sending is down/)
  })
})

describe('POST /refresh', () => {
  it('returns 401 for missing refresh cookie', async () => {
    const handler = fastify.routes['POST /refresh']
    const req = { body: {}, cookies: { __session: 'some-jwt' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 401 for missing session cookie', async () => {
    const handler = fastify.routes['POST /refresh']
    const req = {
      body: {},
      cookies: { __refresh: '550e8400-e29b-41d4-a716-446655440000' },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 401 for invalid refresh token', async () => {
    const handler = fastify.routes['POST /refresh']
    mockRefreshTokenService.validate.mockResolvedValue(null)
    fastify.jwt = {
      sign: vi.fn(),
      verify: vi.fn().mockReturnValue({ userId: 'user1', profileId: 'p1', tokenVersion: 0 }),
    }
    const req = {
      body: {},
      cookies: {
        __session: 'expired-jwt',
        __refresh: '550e8400-e29b-41d4-a716-446655440000',
      },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
    expect(reply.payload.message).toBe('Invalid or expired refresh token')
  })

  it('returns 401 when tokenVersion mismatch (token revoked)', async () => {
    const handler = fastify.routes['POST /refresh']
    mockRefreshTokenService.validate.mockResolvedValue({
      userId: 'user1',
      profileId: 'p1',
      tokenVersion: 0,
    })
    fastify.jwt = {
      sign: vi.fn(),
      verify: vi.fn().mockReturnValue({ userId: 'user1', profileId: 'p1', tokenVersion: 1 }),
    }
    const req = {
      body: {},
      cookies: {
        __session: 'expired-jwt',
        __refresh: '550e8400-e29b-41d4-a716-446655440000',
      },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
    expect(reply.payload.message).toBe('Token revoked')
  })

  it('returns new tokens on valid refresh', async () => {
    const handler = fastify.routes['POST /refresh']
    const profileId = 'cmc7t45x400086w39gj30pzn3'
    mockRefreshTokenService.validate.mockResolvedValue({
      userId: 'user1',
      profileId,
      tokenVersion: 0,
    })
    mockRefreshTokenService.create.mockResolvedValue('new-refresh-token')
    mockUserService.getUserById.mockResolvedValue({
      id: 'user1',
      tokenVersion: 0,
      roles: [],
      language: 'en',
    })
    mockGetExistingUserSession.mockResolvedValue({
      profileId,
      sessionData: {
        userId: 'user1',
        profileId,
        tokenVersion: 0,
        lang: 'en',
        roles: [],
        hasActiveProfile: false,
        profile: { id: profileId, isDatingActive: false, isSocialActive: false, isActive: false },
      },
    })
    fastify.jwt = {
      sign: vi.fn().mockReturnValue('new-jwt'),
      verify: vi.fn().mockReturnValue({ userId: 'user1', profileId, tokenVersion: 0 }),
    }
    const req = {
      body: {},
      cookies: {
        __session: 'expired-jwt',
        __refresh: '550e8400-e29b-41d4-a716-446655440000',
      },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('new-jwt')
    expect(reply.payload.refreshToken).toBeUndefined()
    expect(mockRefreshTokenService.delete).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user1'
    )
    expect(reply.cookies[0].name).toBe('__session')
    expect(reply.cookies[0].value).toBe('new-jwt')
    expect(reply.cookies[1].name).toBe('__refresh')
    expect(reply.cookies[1].value).toBe('new-refresh-token')
    expect(reply.cookies[1].opts.httpOnly).toBe(true)
  })
})

describe('POST /logout', () => {
  it('deletes only the current session and its refresh token, does not bump tokenVersion', async () => {
    const handler = fastify.routes['POST /logout']
    const deleteSession = vi.fn()
    const req = {
      user: { userId: 'user1', profileId: 'p1', tokenVersion: 0 },
      cookies: { __refresh: 'tok-abc' },
      deleteSession,
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockUserService.bumpTokenVersion).not.toHaveBeenCalled()
    expect(deleteSession).toHaveBeenCalled()
    expect(mockRefreshTokenService.delete).toHaveBeenCalledWith('tok-abc', 'user1')
    expect(mockRefreshTokenService.deleteAllForUser).not.toHaveBeenCalled()
    expect(reply.clearedCookies[0]).toMatchObject({
      name: '__session',
      opts: { path: '/' },
    })
    expect(reply.clearedCookies[1]).toMatchObject({
      name: '__refresh',
      opts: { path: '/' },
    })
  })
})

describe('GET /ws-ticket', () => {
  it('returns a ticket UUID', async () => {
    const handler = fastify.routes['GET /ws-ticket']
    const req = {
      user: { userId: 'user1', profileId: 'profile1', tokenVersion: 0 },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.ticket).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('stores ticket in Redis with 30s TTL', async () => {
    const handler = fastify.routes['GET /ws-ticket']
    const req = {
      user: { userId: 'user1', profileId: 'profile1', tokenVersion: 0 },
    }
    await handler(req as any, reply as any)
    expect(fastify.redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^ws-ticket:[0-9a-f-]+$/),
      JSON.stringify({ userId: 'user1', profileId: 'profile1' }),
      'EX',
      30
    )
  })
})

describe('GET /dev/latest-token', () => {
  it('registers the route when DEV_AUTH_BYPASS_ENABLED is true', () => {
    expect(fastify.routes['GET /dev/latest-token']).toBeDefined()
  })

  it('returns 400 when authId is missing', async () => {
    const handler = fastify.routes['GET /dev/latest-token']
    await handler({ query: {} } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.code).toBe('MISSING_AUTH_ID')
  })

  it('returns 404 when no user or no pending token', async () => {
    const handler = fastify.routes['GET /dev/latest-token']
    mockUserService.findByAuthId.mockResolvedValue(null)
    await handler({ query: { authId: 'auth-123' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.code).toBe('NO_PENDING_TOKEN')
  })

  it('returns 404 when user exists but loginToken is null', async () => {
    const handler = fastify.routes['GET /dev/latest-token']
    mockUserService.findByAuthId.mockResolvedValue({ id: 'user1', loginToken: null })
    await handler({ query: { authId: 'auth-123' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.code).toBe('NO_PENDING_TOKEN')
  })

  it('returns 200 with token when available', async () => {
    const handler = fastify.routes['GET /dev/latest-token']
    mockUserService.findByAuthId.mockResolvedValue({ id: 'user1', loginToken: '987654' })
    await handler({ query: { authId: 'auth-123' } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.token).toBe('987654')
  })
})
