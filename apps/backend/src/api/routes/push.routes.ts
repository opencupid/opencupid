// routes/sendMessage.ts
import { FastifyPluginAsync } from 'fastify'

interface PushRequestBody {
  subscription: PushSubscription
  message: string
}

function bufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

const pushRoutes: FastifyPluginAsync = async (fastify) => {
  // fastify.post<{ Body: PushRequestBody }>('/send', async (req, reply) => {

  //   const { subscription, message } = req.body

  //   const payload = {
  //     title: 'New Message!',
  //     body: message || 'Someone sent you something',
  //     icon: '/icons/notify.png',
  //     url: '/inbox',
  //   }

  //   try {
  //     await sendPushNotification(subscription, payload)
  //     reply.code(200).send({ success: true, message: 'Push notification sent successfully' })
  //   } catch (err) {
  //     console.error('Push error:', err)
  //     reply.code(500)
  //   }
  // })

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
