import fp from 'fastify-plugin'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import Redis from 'ioredis'

import { SessionService } from '../services/session.service'
import { sendServiceUnavailableError, sendUnauthorizedError } from '@/api/helpers'
import { appConfig } from '@/lib/appconfig'
import '@fastify/cookie'
import { SESSION_COOKIE } from '@shared/session'
import { getSessionCookie, setSessionCookie } from '@/lib/session'
import { restampRefreshCookieIfPresent } from '@/lib/session-legacy'
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
  //
  // TODO(2026-05-05): Retire the Bearer fallback together with
  // `migrateLegacyToken()` in the frontend authStore. By that date every
  // pre-cutover JWT has expired (cutover 2026-03-30, JWT TTL 30d) and the
  // only clients that could benefit from Bearer auth are dead ones. Drop the
  // `bearerToken` branch, simplify to `const sessionId = cookieToken!` after
  // the missing-cookie guard.
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

    // Session lookup + validation + migration-cookie stamp + TTL refresh all
    // touch Redis (directly or indirectly). Wrap as one unit so any transient
    // Redis failure (restart, network blip during backend deploy) returns a
    // single distinguishable 503 — never fail-open, that would turn infra
    // blips into auth bypasses.
    let sess: SessionData | null
    try {
      sess = await sessionService.get(sessionId)
      if (!sess) {
        return sendUnauthorizedError(reply, 'Session expired')
      }
      if (req.user.tokenVersion !== sess.tokenVersion) {
        return sendUnauthorizedError(reply, 'Token revoked')
      }
      // Refresh the session cookie on every authenticated request. Three
      // jobs in one call:
      //   1. Sliding TTL — resets Max-Age to 30d so active users stay
      //      logged in as long as they keep using the app. Permanent
      //      behavior, survives post-migration sunset.
      //   2. Phase 1 shape migration — stamps the current domain-scoped
      //      shape and (inside `clearLegacyCookie`) wipes the legacy
      //      host-only slot when they're distinct.
      //   3. Phase 0 Bearer → cookie migration — clients that sent only
      //      an `Authorization: Bearer` header now carry a proper cookie
      //      on their next request.
      // Only runs after the full auth chain succeeds, so failed-auth
      // responses don't re-stamp a cookie the client can't use.
      setSessionCookie(reply, sessionId)
      // Phase 1 shape migration for __refresh: same intent as job (2)
      // above but for the refresh cookie. Eager re-stamp here means a
      // planned host migration does not force active sessions to
      // re-authenticate. Sunsets together with `session-legacy.ts`.
      restampRefreshCookieIfPresent(req, reply)
      await sessionService.refreshTtl(sessionId)
    } catch (err) {
      req.log.error({ err, sessionId }, 'Redis error during authenticated request')
      return sendServiceUnavailableError(reply, 'Session lookup failed')
    }

    req.session = sess
    req.deleteSession = async () => {
      return await sessionService.delete(sessionId)
    }
    req.updateSession = async (data: Partial<SessionData>) => {
      return await sessionService.patch(sessionId, data)
    }
  })
})
