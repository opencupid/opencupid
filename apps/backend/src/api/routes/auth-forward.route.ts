import { FastifyPluginAsync } from 'fastify'
import { SessionService } from '@/services/session.service'
import { SESSION_COOKIE } from '@shared/session'
import { JwtPayload } from '@zod/user/user.dto'

/**
 * GET /api/auth/forward
 *
 * Lightweight session validation for Traefik ForwardAuth middleware.
 * Traefik calls this endpoint before serving protected resources (e.g. /user-content/).
 * Returns 200 if the session is valid, 401 otherwise.
 *
 * Unlike the main `authenticate` hook, this does NOT refresh session TTL
 * — it is a pure read to keep media serving fast.
 */
const authForwardRoutes: FastifyPluginAsync = async (fastify) => {
  const sessionService = new SessionService(fastify.redis)

  fastify.get('/forward', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE]
    if (!token) {
      return reply.code(401).send()
    }

    let payload: JwtPayload
    try {
      payload = fastify.jwt.verify<JwtPayload>(token)
    } catch {
      return reply.code(401).send()
    }

    const session = await sessionService.get(token)
    if (!session) {
      return reply.code(401).send()
    }

    if (payload.tokenVersion !== session.tokenVersion) {
      return reply.code(401).send()
    }

    return reply.code(200).send()
  })
}

export default authForwardRoutes
