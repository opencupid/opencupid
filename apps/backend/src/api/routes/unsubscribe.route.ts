import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/lib/prisma'
import { rateLimitConfig, sendError } from '../helpers'
import { hashEmail, verifyUnsubscribeToken } from '@/services/email/unsubscribeToken'

type UnsubscribeResult =
  | { success: true; alreadyUnsubscribed: boolean }
  | { success: false; code: 'INVALID_TOKEN' | 'USER_NOT_FOUND' }

async function applyUnsubscribe(token: string): Promise<UnsubscribeResult> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return { success: false, code: 'INVALID_TOKEN' }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, emailNotificationsOptIn: true },
  })
  if (!user) return { success: false, code: 'USER_NOT_FOUND' }
  if (hashEmail(user.email) !== payload.emailHash) {
    return { success: false, code: 'INVALID_TOKEN' }
  }

  if (!user.emailNotificationsOptIn) {
    return { success: true, alreadyUnsubscribed: true }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailNotificationsOptIn: false },
  })
  return { success: true, alreadyUnsubscribed: false }
}

const unsubscribeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /:token
   * RFC 8058 one-click unsubscribe endpoint. Mail providers POST here with a
   * body of `List-Unsubscribe=One-Click`. Disables notification emails for the
   * user whose identity is encoded in the signed token.
   */
  fastify.post<{ Params: { token: string } }>(
    '/:token',
    {
      config: {
        ...rateLimitConfig(fastify, '1 hour', 20),
      },
    },
    async (req, reply) => {
      const result = await applyUnsubscribe(req.params.token)
      if (!result.success) {
        const status = result.code === 'INVALID_TOKEN' ? 400 : 404
        return sendError(reply, status, result.code)
      }
      return reply.code(200).send({
        success: true,
        alreadyUnsubscribed: result.alreadyUnsubscribed,
      })
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
      const payload = verifyUnsubscribeToken(req.params.token)
      if (!payload) return sendError(reply, 400, 'INVALID_TOKEN')

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, emailNotificationsOptIn: true },
      })
      if (!user || hashEmail(user.email) !== payload.emailHash) {
        return sendError(reply, 400, 'INVALID_TOKEN')
      }

      return reply.code(200).send({
        success: true,
        alreadyUnsubscribed: !user.emailNotificationsOptIn,
      })
    }
  )
}

export default unsubscribeRoutes
