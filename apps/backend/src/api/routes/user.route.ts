import { FastifyPluginAsync } from 'fastify'
import { UserService } from '@/services/user.service'
import { RefreshTokenService } from '@/services/refresh-token.service'
import { sendError, sendUnauthorizedError } from '../helpers'
import { validateBody } from '@/utils/zodValidate'

import type { GetUserSettingsResponse, DeleteAccountResponse } from '@zod/apiResponse.dto'
import {
  SettingsUserSchema,
  UpdateUserLanguagePayloadSchema,
  type UpdateUserLanguagePayload,
  DeleteAccountPayloadSchema,
  type DeleteAccountPayload,
} from '@zod/user/user.dto'

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = UserService.getInstance()
  const refreshTokenService = new RefreshTokenService(fastify.redis)

  /**
   * GET /me
   * Returns account-level settings (email, phone, language, newsletter/push preferences).
   * @returns {GetUserSettingsResponse}
   */
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      try {
        const user = await userService.getUserById(req.user.userId)

        if (!user) return sendUnauthorizedError(reply)
        const response: GetUserSettingsResponse = {
          success: true,
          user: SettingsUserSchema.parse(user),
        }
        return reply.code(200).send(response)
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching user')
        return sendError(reply, 500, 'Failed to fetch user')
      }
    }
  )

  /**
   * PATCH /me
   * Updates the user's preferred language. Also updates the session locale.
   * @body {string} language - Language code (e.g. 'en', 'hu')
   * @returns {{ success: boolean }}
   */
  fastify.patch(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      const body = validateBody<UpdateUserLanguagePayload>(
        UpdateUserLanguagePayloadSchema,
        req,
        reply
      )
      if (!body) return

      try {
        await fastify.prisma.user.update({
          where: { id: req.user.userId },
          data: { language: body.language },
        })
        await req.updateSession({ lang: body.language })

        return reply.code(200).send({ success: true })
      } catch (error) {
        return sendError(reply, 500, 'Failed to update user language')
      }
    }
  )
  fastify.delete(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      const body = validateBody<DeleteAccountPayload>(DeleteAccountPayloadSchema, req, reply)
      if (!body) return

      // Server-side confirmation: the typed identifier must match the
      // authenticated user's email (or phonenumber for phone-auth accounts),
      // case-insensitively. Defends against direct API misuse — the client
      // dialog is not the only line of defence.
      const user = await userService.getUserById(req.user.userId)
      if (!user) return sendUnauthorizedError(reply)
      const identifier = user.email ?? user.phonenumber ?? null
      if (
        !identifier ||
        body.confirmIdentifier.trim().toLowerCase() !== identifier.toLowerCase()
      ) {
        return sendError(reply, 400, 'Confirmation identifier does not match')
      }

      try {
        await userService.deleteAccount(req.user.userId)
      } catch (error) {
        fastify.log.error({ err: error }, 'Error deleting account')
        return sendError(reply, 500, 'Failed to delete account')
      }
      // Post-delete session cleanup is best-effort: the account is already gone,
      // so cleanup failures must not surface as 500 (which would block the
      // frontend from running its logout/redirect path).
      try {
        await refreshTokenService.deleteAllForUser(req.user.userId)
        await req.deleteSession()
        reply.clearCookie('__media_token', { path: '/user-content/' })
      } catch (error) {
        fastify.log.warn({ err: error }, 'Post-delete session cleanup failed')
      }
      const response: DeleteAccountResponse = { success: true }
      return reply.code(200).send(response)
    }
  )
}

export default userRoutes
