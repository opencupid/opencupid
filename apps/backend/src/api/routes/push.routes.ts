import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { rateLimitConfig } from '../helpers'
import { validateBody } from '@/utils/zodValidate'

const DeleteSubscriptionBodySchema = z.object({
  endpoint: z.string().min(1).url(),
})

const pushRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /subscription
   * Registers or updates a web push subscription for the authenticated user.
   * @body {string} endpoint - Push subscription endpoint URL
   * @body {{ p256dh: string, auth: string }} keys - Push encryption keys
   * @returns {{ success, updated }}
   */
  fastify.post(
    '/subscription',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 hour', 5),
    },
    async (req, reply) => {
      const { endpoint, keys } = req.body as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const userId = req.user.userId

      const update = await fastify.prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId,
          lastSeen: new Date(),
        },
        create: {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId,
          deviceInfo: req.headers['user-agent'],
        },
      })

      reply.code(200).send({ success: true, updated: update })
    }
  )

  /**
   * DELETE /subscription
   * Removes a web push subscription by endpoint URL.
   * @body {string} endpoint - Push subscription endpoint URL to remove
   * @returns 204
   */
  fastify.delete(
    '/subscription',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 hour', 5),
    },
    async (req, reply) => {
      const body = validateBody<z.infer<typeof DeleteSubscriptionBodySchema>>(
        DeleteSubscriptionBodySchema,
        req,
        reply
      )
      if (!body) return

      await fastify.prisma.pushSubscription.deleteMany({
        where: { endpoint: body.endpoint, userId: req.user.userId },
      })
      reply.code(204).send()
    }
  )
}

export default pushRoutes
