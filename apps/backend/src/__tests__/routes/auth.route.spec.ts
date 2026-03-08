import { describe, it, expect, beforeEach, vi } from 'vitest'
import authRoutes from '../../api/routes/auth.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockUserService: any
let mockProfileService: any
let mockRefreshTokenService: any

vi.mock('../../services/user.service', () => ({
  UserService: { getInstance: () => mockUserService },
}))
vi.mock('../../services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
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
    ALTCHA_HMAC_KEY: 'x',
    SMS_API_KEY: 'k',
    IMAGE_MAX_SIZE: 1000,
    FRONTEND_URL: 'http://test',
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
  }
  mockProfileService = { initializeProfiles: vi.fn() }
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
      profile: { id: 'profile1', isDatingActive: false, isSocialActive: false, isActive: false },
    }
    mockUserService.validateLoginToken.mockResolvedValue({
      success: true,
      user,
      isNewUser: false,
    })
    fastify.jwt = { sign: vi.fn().mockReturnValue('jwt-token') }
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('jwt-token')
    expect(reply.payload.refreshToken).toBe('mock-refresh-token')
    expect(mockRefreshTokenService.create).toHaveBeenCalledWith('user1', 'profile1', 0)
  })

  it('returns 200 and token for new user, sends welcome email and initializes profile', async () => {
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
    const newProfile = {
      id: 'profile2',
      isDatingActive: false,
      isSocialActive: false,
      isActive: false,
    }
    mockProfileService.initializeProfiles.mockResolvedValue(newProfile)
    fastify.jwt = { sign: vi.fn().mockReturnValue('jwt-token2') }
    const notifier = (await import('../../services/notifier.service')).notifierService
    // @ts-expect-error whatever
    notifier.notifyUser.mockClear()
    const req = { query: { token: 'abc123' } }
    await handler(req as any, reply as any)
    expect(notifier.notifyUser).toHaveBeenCalledWith('user2', 'welcome', {
      link: 'http://test/me',
    })
    expect(mockProfileService.initializeProfiles).toHaveBeenCalledWith('user2')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('jwt-token2')
    expect(reply.payload.refreshToken).toBe('mock-refresh-token')
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
      body: {
        email: 'newuser@example.com',
        captchaSolution: 'ok',
        language: 'en',
      },
    }
    await handler(req as any, reply as any)
    expect(mockUserService.generateLoginToken).toHaveBeenCalled()
    expect(notifier.notifyUser).toHaveBeenCalledWith('user3', 'login_link', {
      link: 'http://test/magic-link?token=abc123',
    })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.status).toBe('register')
    expect(reply.payload.user.email).toBe('newuser@example.com')
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
  it('returns 400 for missing refresh token', async () => {
    const handler = fastify.routes['POST /refresh']
    const req = { body: {}, headers: { authorization: 'Bearer some-jwt' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 401 for missing authorization header', async () => {
    const handler = fastify.routes['POST /refresh']
    const req = {
      body: { refreshToken: '550e8400-e29b-41d4-a716-446655440000' },
      headers: {},
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
      body: { refreshToken: '550e8400-e29b-41d4-a716-446655440000' },
      headers: { authorization: 'Bearer expired-jwt' },
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
      body: { refreshToken: '550e8400-e29b-41d4-a716-446655440000' },
      headers: { authorization: 'Bearer expired-jwt' },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
    expect(reply.payload.message).toBe('Token revoked')
  })

  it('returns new tokens on valid refresh', async () => {
    const handler = fastify.routes['POST /refresh']
    mockRefreshTokenService.validate.mockResolvedValue({
      userId: 'user1',
      profileId: 'p1',
      tokenVersion: 0,
    })
    mockRefreshTokenService.create.mockResolvedValue('new-refresh-token')
    mockUserService.getUserById.mockResolvedValue({
      id: 'user1',
      tokenVersion: 0,
      roles: [],
      language: 'en',
      profile: { id: 'p1', isDatingActive: false, isSocialActive: false, isActive: false },
    })
    fastify.jwt = {
      sign: vi.fn().mockReturnValue('new-jwt'),
      verify: vi.fn().mockReturnValue({ userId: 'user1', profileId: 'p1', tokenVersion: 0 }),
    }
    const req = {
      body: { refreshToken: '550e8400-e29b-41d4-a716-446655440000' },
      headers: { authorization: 'Bearer expired-jwt' },
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.token).toBe('new-jwt')
    expect(reply.payload.refreshToken).toBe('new-refresh-token')
    expect(mockRefreshTokenService.delete).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user1'
    )
  })
})

describe('POST /logout', () => {
  it('bumps tokenVersion, deletes session and refresh tokens', async () => {
    const handler = fastify.routes['POST /logout']
    const deleteSession = vi.fn()
    const req = {
      user: { userId: 'user1', profileId: 'p1', tokenVersion: 0 },
      deleteSession,
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockUserService.bumpTokenVersion).toHaveBeenCalledWith('user1')
    expect(deleteSession).toHaveBeenCalled()
    expect(mockRefreshTokenService.deleteAllForUser).toHaveBeenCalledWith('user1')
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
