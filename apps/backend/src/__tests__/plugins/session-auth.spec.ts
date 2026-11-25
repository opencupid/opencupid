import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    NODE_ENV: 'development',
    REDIS_URL: 'redis://test',
    JWT_SECRET: 'test-secret-test-secret',
    brands: [{ domain: 'localhost', siteName: 'Test' }],
  },
}))

const store = vi.hoisted(() => new Map<string, string>())
const ttl = vi.hoisted(() => new Map<string, number>())
vi.mock('ioredis', () => ({
  default: class {
    get = async (key: string) => store.get(key) ?? null
    // patch(): KEEPTTL XX
    set = async (key: string, value: string) => void (store.has(key) && store.set(key, value))
    // Commands run on exec, in order and without interleaving, like MULTI
    multi() {
      const queue: (() => unknown)[] = []
      const queued =
        (fn: (...args: any[]) => unknown) =>
        (...args: any[]) => {
          queue.push(() => fn(...args))
          return tx
        }
      const tx: any = {
        set: queued((key, value) => store.set(key, value)),
        copy: queued((from, to) => {
          if (!store.has(from)) return 0
          store.set(to, store.get(from)!)
          return 1
        }),
        del: queued((key) => store.delete(key)),
        expire: queued((key, seconds) => ttl.set(key, seconds)),
        sadd: queued(() => 1),
        srem: queued(() => 1),
        exec: async () => queue.map((run) => [null, run()]),
      }
      return tx
    }
  },
}))

import sessionAuth from '../../plugins/session-auth'
import { createSessionJwt, setSessionCookie, signSessionJwt } from '../../lib/session'
import type { SessionData } from '@zod/user/user.dto'

const profileId = 'cmc7t45x400086w39gj30pzn3'
const session: SessionData = {
  userId: 'cmc7t45x400086w39gj30pzn4',
  profileId,
  tokenVersion: 0,
  lang: 'en',
  roles: [],
  hasActiveProfile: false,
  profile: { id: profileId, isDatingActive: false, isSocialActive: false, isActive: false },
}

let fastify: FastifyInstance
let releaseSlow: () => void
let slowStarted: Promise<void>

beforeEach(async () => {
  store.clear()
  ttl.clear()
  fastify = Fastify()
  await fastify.register(cookie)
  await fastify.register(sessionAuth)

  let markStarted: () => void
  slowStarted = new Promise((resolve) => (markStarted = resolve))
  const slow = new Promise<void>((resolve) => (releaseSlow = resolve))
  fastify.register(async (app) => {
    app.get('/ping', { onRequest: [app.authenticate] }, async () => ({ ok: true }))
    app.get('/slow', { onRequest: [app.authenticate] }, async () => {
      markStarted()
      await slow
      return { ok: true }
    })
    app.post('/update', { onRequest: [app.authenticate] }, async (req) => {
      await req.updateSession({ lang: 'hu' })
      return { ok: true }
    })
    app.post('/finish', { onRequest: [app.authenticate] }, async (req, reply) => {
      const jwt = signSessionJwt(fastify, req.session, true)
      if (await req.replaceSession(jwt)) setSessionCookie(reply, jwt)
      return { ok: true }
    })
    app.post('/slow-finish', { onRequest: [app.authenticate] }, async (req, reply) => {
      markStarted()
      await slow
      await req.updateSession({ hasActiveProfile: true })
      const jwt = signSessionJwt(fastify, req.session, true)
      if (await req.replaceSession(jwt)) setSessionCookie(reply, jwt)
      return { ok: true }
    })
  })
  await fastify.ready()
})

afterEach(async () => {
  await fastify.close()
})

const send = (method: 'GET' | 'POST', url: string, jwt: string) =>
  fastify.inject({ method, url, cookies: { __session: jwt } })
const sessionCookie = (res: { cookies: { name: string; value: string }[] }) =>
  res.cookies.filter((c) => c.name === '__session').map((c) => c.value)

describe('session cookie re-stamp', () => {
  it('slides the cookie of an onboarded user', async () => {
    const jwt = await createSessionJwt(fastify, session, true)
    const res = await send('GET', '/ping', jwt)
    expect(res.statusCode).toBe(200)
    expect(sessionCookie(res)).toEqual([jwt])
  })

  it('accepts a pending token but does not re-stamp it', async () => {
    const jwt = await createSessionJwt(fastify, session, false)
    const res = await send('GET', '/ping', jwt)
    expect(res.statusCode).toBe(200)
    expect(sessionCookie(res)).toEqual([])
  })

  it('lets a request in flight across the replacement finish without restoring the old token', async () => {
    const pending = await createSessionJwt(fastify, session, false)

    const inFlight = send('GET', '/slow', pending)
    await slowStarted
    const finished = await send('POST', '/finish', pending)
    releaseSlow()
    const late = await inFlight

    const [replacement, ...rest] = sessionCookie(finished)
    expect(rest).toEqual([])
    expect(replacement).not.toBe(pending)
    expect(fastify.jwt.decode<object>(replacement!)).not.toHaveProperty('pending')

    expect(late.statusCode).toBe(200)
    expect(sessionCookie(late)).toEqual([])

    // The old session still serves requests sent before the browser had the new
    // cookie, and the new one works.
    expect((await send('GET', '/ping', pending)).statusCode).toBe(200)
    expect((await send('GET', '/ping', replacement!)).statusCode).toBe(200)
  })
})

describe('session replacement', () => {
  it('creates no session when the source was revoked after the request authenticated', async () => {
    const pending = await createSessionJwt(fastify, session, false)

    const inFlight = send('POST', '/slow-finish', pending)
    await slowStarted
    store.clear() // e.g. an admin blocks the user, or they log out
    releaseSlow()
    const late = await inFlight

    expect(sessionCookie(late)).toEqual([])
    expect([...store.keys()]).toEqual([])
    expect((await send('GET', '/ping', pending)).statusCode).toBe(401)
    const replacement = signSessionJwt(fastify, session, true)
    expect((await send('GET', '/ping', replacement)).statusCode).toBe(401)
  })

  it('lets the old session expire shortly, even if it is still used', async () => {
    const pending = await createSessionJwt(fastify, session, false)
    const month = 60 * 60 * 24 * 30

    const [replacement] = sessionCookie(await send('POST', '/finish', pending))
    expect(ttl.get(`session:${pending}`)).toBe(60)
    expect(ttl.get(`session:${replacement}`)).toBe(month)

    await send('GET', '/ping', pending)
    await send('POST', '/update', pending)
    expect(ttl.get(`session:${pending}`)).toBe(60)
  })

  it('carries over what the request changed in the session', async () => {
    const pending = await createSessionJwt(fastify, session, false)
    releaseSlow()
    const [replacement] = sessionCookie(await send('POST', '/slow-finish', pending))
    expect(JSON.parse(store.get(`session:${replacement}`)!)).toMatchObject({
      userId: session.userId,
      hasActiveProfile: true,
    })
  })
})
