import { FastifyPluginAsync } from 'fastify'
import { rateLimitConfig } from '../helpers'

const pushRoutes: FastifyPluginAsync = async (fastify) => {
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

  fastify.delete(
    '/subscription',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 hour', 5),
    },
    async (req, reply) => {
      const { endpoint } = req.body as { endpoint: string }
      await fastify.prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user.userId },
      })
      reply.code(204).send()
    }
  )
}

export default pushRoutes
