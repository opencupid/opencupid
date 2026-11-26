import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { createSigner } from 'fast-jwt'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
  },
}))

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  emailPreference: {
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
  mockPrisma.emailPreference.upsert.mockReset()
  await unsubscribeRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

const EMAIL = 'alice@example.com'
const USER_ID = 'user-1'

function validToken() {
  return signUnsubscribeToken({
    userId: USER_ID,
    emailHash: hashEmail(EMAIL),
    scope: 'notifications',
  })
}

function remindersToken() {
  return signUnsubscribeToken({ userId: USER_ID, emailHash: hashEmail(EMAIL), scope: 'reminders' })
}

/** The user row resolveToken loads: the address and the rows for the token's scopes. */
function userWith({
  granted = true as boolean | null,
  email = EMAIL,
  scopes = ['notifications', 'reminders'],
} = {}) {
  return {
    email,
    emailPreferences: granted === null ? [] : scopes.map((scope) => ({ scope, granted })),
  }
}

/** Signs claims the way tokens in emails sent before scoped claims were. */
const legacySigner = createSigner({
  key: 'test-unsubscribe-secret',
  algorithm: 'HS256',
  expiresIn: TOKEN_TTL_SECONDS * 1000,
})

function expectTurnedOff(scope: string) {
  expect(mockPrisma.emailPreference.upsert).toHaveBeenCalledWith({
    where: { userId_scope: { userId: USER_ID, scope } },
    create: { userId: USER_ID, scope, granted: false, source: 'unsubscribe_link' },
    update: { granted: false, source: 'unsubscribe_link' },
  })
}

describe('reminders scope', () => {
  it('turns off reminder emails only', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    await fastify.routes['POST /:token'](
      { params: { token: remindersToken() } } as any,
      reply as any
    )

    expect(reply.payload).toEqual({ success: true, alreadyUnsubscribed: false, scope: 'reminders' })
    expect(mockPrisma.emailPreference.upsert).toHaveBeenCalledTimes(1)
    expectTurnedOff('reminders')
  })

  it('loads only the row for the token scope', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    await fastify.routes['GET /:token'](
      { params: { token: remindersToken() } } as any,
      reply as any
    )

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: {
        email: true,
        emailPreferences: {
          where: { scope: { in: ['reminders'] } },
          select: { scope: true, granted: true },
        },
      },
    })
  })

  it('is idempotent when already turned off', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ granted: false }))

    await fastify.routes['POST /:token'](
      { params: { token: remindersToken() } } as any,
      reply as any
    )

    expect(reply.payload.alreadyUnsubscribed).toBe(true)
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
  })

  it('accepts links from nearby-digest emails sent before the reminders scope', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())
    const token = legacySigner({
      userId: USER_ID,
      emailHash: hashEmail(EMAIL),
      scope: 'nearby_signups',
    })

    await fastify.routes['POST /:token']({ params: { token } } as any, reply as any)

    expect(reply.payload.scope).toBe('reminders')
    expect(mockPrisma.emailPreference.upsert).toHaveBeenCalledTimes(1)
    expectTurnedOff('reminders')
  })

  it('turns off notifications and reminders for an unscoped link from an older email', async () => {
    // Those links turned off all notification email, nearby digests included.
    mockPrisma.user.findUnique.mockResolvedValue(userWith())
    const token = legacySigner({ userId: USER_ID, emailHash: hashEmail(EMAIL) })

    await fastify.routes['POST /:token']({ params: { token } } as any, reply as any)

    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'notifications',
    })
    expectTurnedOff('notifications')
    expectTurnedOff('reminders')
  })

  it('still turns off reminders for an unscoped link when only notifications is off', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: EMAIL,
      emailPreferences: [
        { scope: 'notifications', granted: false },
        { scope: 'reminders', granted: true },
      ],
    })
    const token = legacySigner({ userId: USER_ID, emailHash: hashEmail(EMAIL) })

    await fastify.routes['POST /:token']({ params: { token } } as any, reply as any)

    expect(reply.payload.alreadyUnsubscribed).toBe(false)
    expectTurnedOff('reminders')
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
  it('turns off notification email on valid token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'notifications',
    })
    expectTurnedOff('notifications')
  })

  it('is idempotent when user is already unsubscribed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ granted: false }))

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: true,
      scope: 'notifications',
    })
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
  })

  it('writes the scope off when its preference row is missing', async () => {
    // Before the backfill runs a user has no rows; writing "off" keeps the
    // backfill from later turning the scope back on.
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ granted: null }))

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.payload.alreadyUnsubscribed).toBe(false)
    expectTurnedOff('notifications')
  })

  it('rejects a token signed for a different email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ email: 'new@example.com' }))

    const handler = fastify.routes['POST /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(400)
    expect(reply.payload.success).toBe(false)
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
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
    const token = validToken()
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
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
  })
})

describe('GET /unsubscribe/:token', () => {
  it('reports current subscription state without side effects', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith())

    const handler = fastify.routes['GET /:token']
    await handler({ params: { token: validToken() } } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'notifications',
    })
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
  })

  it('reports alreadyUnsubscribed when the scope is off', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWith({ granted: false }))

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
    mockPrisma.user.findUnique.mockResolvedValue(userWith())
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
    expect(res.json()).toEqual({
      success: true,
      alreadyUnsubscribed: false,
      scope: 'notifications',
    })
    expectTurnedOff('notifications')
  })

  it('turns off only reminders on a one-click POST with a reminders token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/unsubscribe/${remindersToken()}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.emailPreference.upsert).toHaveBeenCalledTimes(1)
    expectTurnedOff('reminders')
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
    expectTurnedOff('notifications')
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
    expect(mockPrisma.emailPreference.upsert).not.toHaveBeenCalled()
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
