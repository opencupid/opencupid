import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
  },
}))

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import unsubscribeRoutes from '../../api/routes/unsubscribe.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import {
  hashEmail,
  signUnsubscribeToken,
  TOKEN_TTL_SECONDS,
} from '@/services/email/unsubscribeToken'

let fastify: MockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockPrisma.user.findUnique.mockReset()
  mockPrisma.user.update.mockReset()
  await unsubscribeRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

const EMAIL = 'alice@example.com'
const USER_ID = 'user-1'

function validToken() {
  return signUnsubscribeToken({ userId: USER_ID, emailHash: hashEmail(EMAIL) })
}

describe('POST /unsubscribe/:token', () => {
  it('disables email notifications on valid token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      emailNotificationsOptIn: true,
    })
    mockPrisma.user.update.mockResolvedValue({})

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: false })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { emailNotificationsOptIn: false },
    })
  })

  it('is idempotent when user is already unsubscribed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      emailNotificationsOptIn: false,
    })

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: true })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects a token signed for a different email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: 'new@example.com',
      emailNotificationsOptIn: true,
    })

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(400)
    expect(reply.payload.success).toBe(false)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects a garbage token', async () => {
    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: 'not-a-token' } } as any, reply as any)

    expect(reply.statusCode).toBe(400)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejects an expired token', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const token = signUnsubscribeToken({ userId: USER_ID, emailHash: hashEmail(EMAIL) })
    vi.advanceTimersByTime((TOKEN_TTL_SECONDS + 60) * 1000)

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token } } as any, reply as any)
    vi.useRealTimers()

    expect(reply.statusCode).toBe(400)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when user no longer exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(404)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })
})

describe('GET /unsubscribe/:token', () => {
  it('reports current subscription state without side effects', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: EMAIL,
      emailNotificationsOptIn: true,
    })

    const handler = fastify.routes['GET /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: false })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('reports alreadyUnsubscribed when the flag is off', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: EMAIL,
      emailNotificationsOptIn: false,
    })

    const handler = fastify.routes['GET /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.alreadyUnsubscribed).toBe(true)
  })

  it('rejects an invalid token', async () => {
    const handler = fastify.routes['GET /:token']
    await handler({ params: { token: 'nope' } } as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })
})
