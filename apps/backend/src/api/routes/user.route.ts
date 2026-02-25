import { FastifyPluginAsync } from 'fastify'
import { UserService } from 'src/services/user.service'
import { sendError, sendUnauthorizedError } from '../helpers'

import type { UserMeResponse } from '@zod/apiResponse.dto'
import { User } from '@zod/generated'

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
        const response: UserMeResponse = { success: true, user }
        return reply.code(200).send(response)
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching user')
        return sendError(reply, 500, 'Failed to fetch user')
      }
    }
  )

  // !!! TODO this is a temporary endpoint/hack to update the language
  // need to be replaced with a proper user settings endpoint
  fastify.patch(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (req, reply) => {
      const { language, newsletterOptIn, isPushNotificationEnabled } = req.body as {
        language?: string
        newsletterOptIn?: boolean
        isPushNotificationEnabled?: boolean
      }
      if (!language && newsletterOptIn === undefined && isPushNotificationEnabled === undefined) {
        return sendError(
          reply,
          400,
          'At least one field (language, newsletterOptIn, or isPushNotificationEnabled) is required'
        )
      }
      try {
        const updateData: Partial<User> = {
          id: req.user.userId,
        }
        if (language) {
          updateData.language = language
        }
        if (newsletterOptIn !== undefined) {
          updateData.newsletterOptIn = newsletterOptIn
        }
        if (isPushNotificationEnabled !== undefined) {
          updateData.isPushNotificationEnabled = isPushNotificationEnabled
          if (isPushNotificationEnabled === false) {
            await fastify.prisma.pushSubscription.deleteMany({ where: { userId: req.user.userId } })
          }
        }
        await userService.update(updateData as User)
        await req.deleteSession()

        return reply.code(200).send({ success: true })
      } catch (error) {
        return sendError(reply, 500, 'Failed to update user settings')
      }
    }
  )
}

export default userRoutes
