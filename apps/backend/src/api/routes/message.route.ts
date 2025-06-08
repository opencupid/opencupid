import { FastifyPluginAsync } from 'fastify'
import { sendUnauthorizedError } from '../helpers'
import { MessageService } from '@/services/message.service'
import { z } from 'zod'


const messageRoutes: FastifyPluginAsync = async (fastify) => {

  
  const messageService = MessageService.getInstance()

  fastify.get('/:userId', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.user.userId) return sendUnauthorizedError(reply)

    const ParamsSchema = z.object({ userId: z.string().cuid() })
    const { userId: otherUserId } = ParamsSchema.parse(req.params)

    try {
      const messages = await messageService.getConversation(req.user.userId, otherUserId)
      return reply.code(200).send({ success: true, messages })
    } catch (err) {
      fastify.log.error('Failed to retrieve conversation', err)
      return reply.code(500).send({ success: false })
    }

  })

}

export default messageRoutes
