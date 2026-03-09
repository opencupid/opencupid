import { describe, it, expect, beforeEach, vi } from 'vitest'
import userRoutes from '../../api/routes/user.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockUserService: any

vi.mock('../../services/user.service', () => ({
  UserService: { getInstance: () => mockUserService },
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
  fastify.prisma = { user: { update: vi.fn() } }
  reply = new MockReply()
  mockUserService = {
    getUserById: vi.fn(),
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
