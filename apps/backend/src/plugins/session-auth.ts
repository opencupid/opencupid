import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import Redis from 'ioredis'

import { SessionService } from '../services/session.service'
import { sendUnauthorizedError } from '@/api/helpers'
import { appConfig } from '@/lib/appconfig'
import '@fastify/cookie'
import { SESSION_COOKIE } from '@shared/session'
import { getSessionCookie, setSessionCookie } from '@/lib/session'
import { SessionData } from '@zod/user/user.dto'

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
    createSession: (token: string, data: SessionData) => Promise<void>
  }
  interface FastifyRequest {
    session: SessionData
    deleteSession: () => Promise<void>
    updateSession: (data: Partial<SessionData>) => Promise<void>
  }
}

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: appConfig.JWT_SECRET,
    sign: { expiresIn: '30d' },
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  })

  // Initialize Redis client
  const redis = new Redis(redisUrl)
  fastify.decorate('redis', redis)
  const sessionService = new SessionService(redis)

  fastify.decorate('createSession', async (token: string, data: SessionData): Promise<void> => {
    await sessionService.getOrCreate(token, data)
  })

  // Auth hook reads JWT from Authorization header (if present) or __session
  // cookie. @fastify/jwt checks Bearer header first, then falls back to cookie.
  // Old clients still sending Authorization: Bearer get migrated to the cookie.
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    const cookieToken = getSessionCookie(req)
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null

    if (!cookieToken && !bearerToken) {
      return sendUnauthorizedError(reply, 'Missing session cookie')
    }

    try {
      await req.jwtVerify()
    } catch (err) {
      return sendUnauthorizedError(reply)
    }

    // Resolve the session ID — prefer cookie, fall back to Bearer token
    const sessionId = cookieToken ?? bearerToken!

    // Silent cookie migration: rewrite every authenticated request to the
    // domain-scoped cookie shape and delete the legacy host-only variant.
    // Also covers the older localStorage → Bearer-header migration by
    // stamping the cookie when the client only sent a Bearer token. Runs on
    // the hot path so every active user is migrated on their very next
    // authenticated call. Remove once the migration window has elapsed.
    setSessionCookie(reply, sessionId)

    // Try to fetch an existing session from Redis
    const sess = await sessionService.get(sessionId)
    if (!sess) {
      return sendUnauthorizedError(reply, 'Session expired')
    }

    // Verify tokenVersion matches between JWT and session
    if (req.user.tokenVersion !== sess.tokenVersion) {
      return sendUnauthorizedError(reply, 'Token revoked')
    }

    // Refresh TTL on simple reads
    await sessionService.refreshTtl(sessionId)

    req.session = sess
    req.deleteSession = async () => {
      return await sessionService.delete(sessionId)
    }
    req.updateSession = async (data: Partial<SessionData>) => {
      return await sessionService.patch(sessionId, data)
    }
  })
})
