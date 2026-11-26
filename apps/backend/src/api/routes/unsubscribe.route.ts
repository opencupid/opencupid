import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/lib/prisma'
import { rateLimitConfig, sendError } from '../helpers'
import { hashEmail, verifyUnsubscribeToken } from '@/services/email/unsubscribeToken'
import { setEmailPreferences } from '@/services/emailPreference.service'
import { EMAIL_SCOPES, type EmailScope } from '@zod/user/emailPreference.dto'

type Resolved =
  | {
      success: true
      userId: string
      scopes: readonly EmailScope[]
      alreadyUnsubscribed: boolean
    }
  | { success: false; code: 'INVALID_TOKEN' | 'USER_NOT_FOUND' }

/**
 * Verify the token and load its user; the token's email fingerprint must still
 * match. `all` widens what is turned off from the token's scopes to every scope.
 */
async function resolveToken(token: string, { all = false } = {}): Promise<Resolved> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return { success: false, code: 'INVALID_TOKEN' }
  const scopes = all ? EMAIL_SCOPES : payload.scopes

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      email: true,
      emailPreferences: {
        where: { scope: { in: [...scopes] } },
        select: { scope: true, granted: true },
      },
    },
  })
  if (!user) return { success: false, code: 'USER_NOT_FOUND' }
  if (hashEmail(user.email) !== payload.emailHash) {
    return { success: false, code: 'INVALID_TOKEN' }
  }
  return {
    success: true,
    userId: payload.userId,
    scopes,
    // Only an explicit "off" row counts: a missing row is written as off, so a
    // later backfill cannot turn the scope back on.
    alreadyUnsubscribed: scopes.every((scope) =>
      user.emailPreferences.some((row) => row.scope === scope && !row.granted)
    ),
  }
}

async function turnOff(userId: string, scopes: readonly EmailScope[]) {
  const off = Object.fromEntries(scopes.map((scope) => [scope, false]))
  await setEmailPreferences(prisma, userId, off, 'unsubscribe_link')
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

      const { userId, scopes, alreadyUnsubscribed } = resolved
      if (!alreadyUnsubscribed) await turnOff(userId, scopes)
      return reply.code(200).send({ success: true, alreadyUnsubscribed, scope: scopes[0] })
    }
  )

  /**
   * POST /:token/all
   * The landing page's "unsubscribe from all emails" button: turns off every
   * email scope for the token's user, whatever scope the link was for.
   * Sign-in links are not a scope and are still sent.
   */
  fastify.post<{ Params: { token: string } }>(
    '/:token/all',
    {
      config: {
        ...rateLimitConfig(fastify, '1 hour', 20),
      },
    },
    async (req, reply) => {
      const resolved = await resolveToken(req.params.token, { all: true })
      if (!resolved.success) {
        return sendError(reply, resolved.code === 'INVALID_TOKEN' ? 400 : 404, resolved.code)
      }

      const { userId, scopes, alreadyUnsubscribed } = resolved
      if (!alreadyUnsubscribed) await turnOff(userId, scopes)
      return reply.code(200).send({ success: true, alreadyUnsubscribed })
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

      const { scopes, alreadyUnsubscribed } = resolved
      return reply.code(200).send({ success: true, alreadyUnsubscribed, scope: scopes[0] })
    }
  )
}

export default unsubscribeRoutes
