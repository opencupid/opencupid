import { describe, it, expect, beforeEach, vi } from 'vitest'
import userRoutes from '../../api/routes/user.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockUserService: any
let mockRefreshTokenService: any

vi.mock('../../services/user.service', () => ({
  UserService: { getInstance: () => mockUserService },
}))
vi.mock('../../services/refresh-token.service', () => ({
  RefreshTokenService: class {
    deleteAllForUser(...args: any[]) {
      return mockRefreshTokenService.deleteAllForUser(...args)
    }
  },
}))
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    ALTCHA_HMAC_KEY: 'x',
    IMAGE_MAX_SIZE: 1000,
    FRONTEND_URL: 'http://test',
  },
}))

beforeEach(async () => {
  fastify = new MockFastify()
  fastify.prisma = { user: { update: vi.fn() } }
  reply = new MockReply()
  mockUserService = {
    getUserById: vi.fn(),
    deleteAccount: vi.fn(),
  }
  mockRefreshTokenService = {
    deleteAllForUser: vi.fn(),
  }
  await userRoutes(fastify as any, {})
})

describe('GET /me', () => {
  it('returns user data on success', async () => {
    const handler = fastify.routes['GET /me']
    const user = {
      email: 'a@b.com',
      phonenumber: null,
      language: 'en',
      newsletterOptIn: false,
      isPushNotificationEnabled: false,
    }
    mockUserService.getUserById.mockResolvedValue(user)
    const req = { user: { userId: 'u1' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.user).toEqual(user)
  })

  it('returns 401 if user not found', async () => {
    const handler = fastify.routes['GET /me']
    mockUserService.getUserById.mockResolvedValue(null)
    const req = { user: { userId: 'u1' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })
})

describe('PATCH /me', () => {
  it('returns 400 if body is invalid', async () => {
    const handler = fastify.routes['PATCH /me']
    const req = { user: { userId: 'u1' }, body: {} }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 if language is too short', async () => {
    const handler = fastify.routes['PATCH /me']
    const req = { user: { userId: 'u1' }, body: { language: 'x' } }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })

  it('updates language and patches session', async () => {
    const handler = fastify.routes['PATCH /me']
    const updateSession = vi.fn()
    const req = {
      user: { userId: 'u1' },
      body: { language: 'de' },
      updateSession,
    }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(fastify.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { language: 'de' },
    })
    expect(updateSession).toHaveBeenCalledWith({ lang: 'de' })
  })
})

describe('DELETE /me', () => {
  it('deletes account, clears tokens and session, returns 200', async () => {
    const handler = fastify.routes['DELETE /me']
    const deleteSession = vi.fn().mockResolvedValue(undefined)
    mockUserService.deleteAccount.mockResolvedValue(undefined)
    mockRefreshTokenService.deleteAllForUser.mockResolvedValue(undefined)
    const req = { user: { userId: 'u1' }, deleteSession }
    await handler(req as any, reply as any)
    expect(mockUserService.deleteAccount).toHaveBeenCalledWith('u1')
    expect(mockRefreshTokenService.deleteAllForUser).toHaveBeenCalledWith('u1')
    expect(deleteSession).toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.clearedCookies.some((c) => c.name === '__media_token')).toBe(true)
  })

  it('returns 500 if deleteAccount throws', async () => {
    const handler = fastify.routes['DELETE /me']
    mockUserService.deleteAccount.mockRejectedValue(new Error('db error'))
    const req = { user: { userId: 'u1' }, deleteSession: vi.fn() }
    await handler(req as any, reply as any)
    expect(reply.statusCode).toBe(500)
  })
})
