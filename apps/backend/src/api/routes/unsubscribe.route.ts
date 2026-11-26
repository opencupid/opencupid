import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/lib/prisma'
import { rateLimitConfig, sendError } from '../helpers'
import { hashEmail, verifyUnsubscribeToken } from '@/services/email/unsubscribeToken'
import { setEmailPreferences } from '@/services/emailPreference.service'
import type { EmailScope } from '@zod/user/emailPreference.dto'

type Resolved =
  | { success: true; userId: string; scope: EmailScope; alreadyUnsubscribed: boolean }
  | { success: false; code: 'INVALID_TOKEN' | 'USER_NOT_FOUND' }

/** Verify the token and load its user; the token's email fingerprint must still match. */
async function resolveToken(token: string): Promise<Resolved> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return { success: false, code: 'INVALID_TOKEN' }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      email: true,
      emailPreferences: { where: { scope: payload.scope }, select: { granted: true } },
    },
  })
  if (!user) return { success: false, code: 'USER_NOT_FOUND' }
  if (hashEmail(user.email) !== payload.emailHash) {
    return { success: false, code: 'INVALID_TOKEN' }
  }
  return {
    success: true,
    userId: payload.userId,
    scope: payload.scope,
    alreadyUnsubscribed: !user.emailPreferences[0]?.granted,
  }
}

const unsubscribeRoutes: FastifyPluginAsync = async (fastify) => {
  // RFC 8058 one-click POSTs carry `List-Unsubscribe=One-Click` as
  // application/x-www-form-urlencoded or multipart/form-data. Fastify parses
  // neither by default and would answer 415 before the handler runs. The token
  // in the path is the only input, so the body is read and discarded. Scoped to
  // this plugin, so no other route accepts these content types.
  fastify.addContentTypeParser(
    ['application/x-www-form-urlencoded', 'multipart/form-data'],
    { parseAs: 'string', bodyLimit: 1024 },
    (_req, _body, done) => done(null, undefined)
  )

  /**
   * POST /:token
   * RFC 8058 one-click unsubscribe endpoint. Mail providers POST here with a
   * body of `List-Unsubscribe=One-Click`. Turns off the token's email scope
   * for its user.
   */
  fastify.post<{ Params: { token: string } }>(
    '/:token',
    {
      config: {
        ...rateLimitConfig(fastify, '1 hour', 20),
      },
    },
    async (req, reply) => {
      const resolved = await resolveToken(req.params.token)
      if (!resolved.success) {
        return sendError(reply, resolved.code === 'INVALID_TOKEN' ? 400 : 404, resolved.code)
      }

      const { userId, scope, alreadyUnsubscribed } = resolved
      if (!alreadyUnsubscribed) {
        await setEmailPreferences(prisma, userId, { [scope]: false }, 'unsubscribe_link')
      }
      return reply.code(200).send({ success: true, alreadyUnsubscribed, scope })
    }
  )

  /**
   * GET /:token
   * Checks the token and reports whether the user is already unsubscribed.
   * The frontend landing page uses this to render state without side effects,
   * then calls POST when the user confirms (or applies immediately, depending
   * on UX).
   */
  fastify.get<{ Params: { token: string } }>(
    '/:token',
    {
      config: {
        ...rateLimitConfig(fastify, '1 hour', 30),
      },
    },
    async (req, reply) => {
      const resolved = await resolveToken(req.params.token)
      // A token whose user is gone reads as invalid here, as before.
      if (!resolved.success) return sendError(reply, 400, 'INVALID_TOKEN')

      const { scope, alreadyUnsubscribed } = resolved
      return reply.code(200).send({ success: true, alreadyUnsubscribed, scope })
    }
  )
}

export default unsubscribeRoutes
