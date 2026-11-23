import { FastifyPluginAsync } from 'fastify'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { rateLimitConfig, sendError } from '../helpers'
import {
  hashEmail,
  verifyUnsubscribeToken,
  type UnsubscribeScope,
} from '@/services/email/unsubscribeToken'

type TokenUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    emailNotificationsOptIn: true
    profile: { select: { id: true; nearbySignupOptOut: { select: { profileId: true } } } }
  }
}>

/** How each unsubscribe scope reads and turns off its own switch. */
const SCOPES: Record<
  UnsubscribeScope,
  {
    isOff: (user: TokenUser) => boolean
    turnOff: (user: TokenUser) => Promise<unknown>
  }
> = {
  all: {
    isOff: (user) => !user.emailNotificationsOptIn,
    turnOff: (user) =>
      prisma.user.update({ where: { id: user.id }, data: { emailNotificationsOptIn: false } }),
  },
  nearby_signups: {
    isOff: (user) => !!user.profile?.nearbySignupOptOut,
    turnOff: (user) =>
      prisma.nearbySignupOptOut.upsert({
        where: { profileId: user.profile!.id },
        create: { profileId: user.profile!.id },
        update: {},
      }),
  },
}

type Resolved =
  | { success: true; user: TokenUser; scope: UnsubscribeScope }
  | { success: false; code: 'INVALID_TOKEN' | 'USER_NOT_FOUND' }

/** Verify the token and load its user; the token's email fingerprint must still match. */
async function resolveToken(token: string): Promise<Resolved> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return { success: false, code: 'INVALID_TOKEN' }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      emailNotificationsOptIn: true,
      profile: { select: { id: true, nearbySignupOptOut: { select: { profileId: true } } } },
    },
  })
  if (!user) return { success: false, code: 'USER_NOT_FOUND' }
  if (hashEmail(user.email) !== payload.emailHash) {
    return { success: false, code: 'INVALID_TOKEN' }
  }
  // Nearby-signups tokens are only issued to profiles; without one there is nothing to switch.
  if (payload.scope === 'nearby_signups' && !user.profile) {
    return { success: false, code: 'USER_NOT_FOUND' }
  }
  return { success: true, user, scope: payload.scope }
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
   * body of `List-Unsubscribe=One-Click`. Turns off the token's scope (all
   * notification email, or nearby-signups digests only) for its user.
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

      const { user, scope } = resolved
      const alreadyUnsubscribed = SCOPES[scope].isOff(user)
      if (!alreadyUnsubscribed) await SCOPES[scope].turnOff(user)
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

      const { user, scope } = resolved
      return reply.code(200).send({
        success: true,
        alreadyUnsubscribed: SCOPES[scope].isOff(user),
        scope,
      })
    }
  )
}

export default unsubscribeRoutes
