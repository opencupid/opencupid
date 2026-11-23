import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

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
  nearbySignupOptOut: {
    upsert: vi.fn(),
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

const PROFILE_ID = 'profile-1'

function nearbyToken() {
  return signUnsubscribeToken({
    userId: USER_ID,
    emailHash: hashEmail(EMAIL),
    scope: 'nearby_signups',
  })
}

function userWith({ optedOut = false, notifications = true } = {}) {
  return {
    id: USER_ID,
    email: EMAIL,
    emailNotificationsOptIn: notifications,
    profile: { id: PROFILE_ID, nearbySignupOptOut: optedOut ? { profileId: PROFILE_ID } : null },
  }
}

describe('nearby_signups scope', () => {
  it('opts out of nearby-signups emails only', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    await fastify.routes['POST /:token']({ params: { token: nearbyToken() } } as any, reply as any)

    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'nearby_signups',
    })
    expect(mockPrisma.nearbySignupOptOut.upsert).toHaveBeenCalledWith({
      where: { profileId: PROFILE_ID },
      create: { profileId: PROFILE_ID },
      update: {},
    })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('is idempotent when already opted out', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ optedOut: true }))

    await fastify.routes['POST /:token']({ params: { token: nearbyToken() } } as any, reply as any)

    expect(reply.payload.alreadyUnsubscribed).toBe(true)
    expect(mockPrisma.nearbySignupOptOut.upsert).not.toHaveBeenCalled()
  })

  it('reports the scope and the opt-out state on GET, ignoring the global flag', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ notifications: false }))

    await fastify.routes['GET /:token']({ params: { token: nearbyToken() } } as any, reply as any)

    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'nearby_signups',
    })
  })

  it('rejects a nearby token for a user without a profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...userWith(), profile: null })

    await fastify.routes['POST /:token']({ params: { token: nearbyToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(404)
    expect(mockPrisma.nearbySignupOptOut.upsert).not.toHaveBeenCalled()
  })

  it('rejects a token with an unknown scope', async () => {
    const token = signUnsubscribeToken({
      userId: USER_ID,
      emailHash: hashEmail(EMAIL),
      scope: 'everything' as any,
    })

    await fastify.routes['POST /:token']({ params: { token } } as any, reply as any)

    expect(reply.statusCode).toBe(400)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })
})

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
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: false, scope: 'all' })
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
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: true, scope: 'all' })
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
    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: false, scope: 'all' })
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

// Real Fastify instance: content-type handling happens before the handler, so
// the MockFastify tests above cannot catch a 415.
describe('one-click request bodies (RFC 8058)', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    // Same router option as api.ts: signed tokens exceed the 100-char default.
    app = Fastify({ routerOptions: { maxParamLength: 500 } })
    await app.register(unsubscribeRoutes, { prefix: '/api/unsubscribe' })
    // A sibling route: the parser must not leak out of the unsubscribe scope.
    app.post('/api/other', async () => ({ ok: true }))
    await app.ready()
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      emailNotificationsOptIn: true,
    })
    mockPrisma.user.update.mockResolvedValue({})
  })

  afterEach(async () => {
    await app.close()
  })

  it('unsubscribes on a form-urlencoded one-click POST, as Gmail and Yahoo send it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/unsubscribe/${validToken()}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ success: true, alreadyUnsubscribed: false, scope: 'all' })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { emailNotificationsOptIn: false },
    })
  })

  it('opts out of nearby-signups only on a one-click POST with a scoped token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    const res = await app.inject({
      method: 'POST',
      url: `/api/unsubscribe/${nearbyToken()}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.nearbySignupOptOut.upsert).toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('unsubscribes on a multipart/form-data one-click POST', async () => {
    const boundary = 'xBOUNDARYx'
    const res = await app.inject({
      method: 'POST',
      url: `/api/unsubscribe/${validToken()}`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload:
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="List-Unsubscribe"\r\n\r\n' +
        'One-Click\r\n' +
        `--${boundary}--\r\n`,
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalled()
  })

  it('still accepts the bodiless POST the unsubscribe page sends', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/unsubscribe/${validToken()}` })
    expect(res.statusCode).toBe(200)
  })

  it('rejects an invalid token sent with a form body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/unsubscribe/not-a-token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    })
    expect(res.statusCode).toBe(400)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('does not accept form bodies on routes outside the unsubscribe plugin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/other',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'a=b',
    })
    expect(res.statusCode).toBe(415)
  })
})
