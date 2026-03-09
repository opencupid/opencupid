import { FastifyPluginAsync } from 'fastify'
import { UserService } from 'src/services/user.service'
import { sendError, sendUnauthorizedError } from '../helpers'
import { validateBody } from '@/utils/zodValidate'

import type { GetUserSettingsResponse } from '@zod/apiResponse.dto'
import { UpdateUserLanguagePayloadSchema, type UpdateUserLanguagePayload } from '@zod/user/user.dto'

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = UserService.getInstance()

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      try {
        const user = await userService.getUserById(req.user.userId, {
          select: {
            email: true,
            phonenumber: true,
            language: true,
            newsletterOptIn: true,
            isPushNotificationEnabled: true,
          },
        })

        if (!user) return sendUnauthorizedError(reply)
        const response: GetUserSettingsResponse = { success: true, user }
        return reply.code(200).send(response)
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching user')
        return sendError(reply, 500, 'Failed to fetch user')
      }
    }
  )

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
}

export default userRoutes
