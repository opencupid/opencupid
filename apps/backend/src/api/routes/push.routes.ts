import { FastifyPluginAsync } from 'fastify'

const pushRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/subscription', { onRequest: [fastify.authenticate] }, async (req, reply) => {
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
  })
}

export default pushRoutes
