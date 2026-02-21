import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendError } from '../helpers'
import { CallService } from '@/services/call.service'
import { broadcastToProfile } from '@/utils/wsUtils'
import { mapProfileSummary } from '@/api/mappers/profile.mappers'
import { WebPushService } from '@/services/webpush.service'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

const ConversationIdParamsSchema = z.object({
  conversationId: z.string().cuid(),
})

const CallableBodySchema = z.object({
  isCallable: z.boolean(),
})

const InitiateCallBodySchema = z.object({
  conversationId: z.string().cuid(),
})

const callRoutes: FastifyPluginAsync = async (fastify) => {
  const callService = CallService.getInstance()
  const webPushService = WebPushService.getInstance()

  // POST / — initiate a call
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile not found.')

    const body = InitiateCallBodySchema.safeParse(req.body)
    if (!body.success) return sendError(reply, 400, 'Invalid parameters')

    try {
      const { roomName, calleeProfileId, callerPublicName } = await fastify.prisma.$transaction(
        async (tx) => {
          return await callService.initiateCall(tx, body.data.conversationId, profileId)
        }
      )

      // Notify callee via WS, fall back to push notification if offline
      const isWsBroadcasted = broadcastToProfile(fastify, calleeProfileId, {
        type: 'ws:incoming_call',
        payload: {
          conversationId: body.data.conversationId,
          roomName,
          caller: { id: profileId, publicName: callerPublicName },
        },
      })

      if (!isWsBroadcasted && WebPushService.isWebPushConfigured()) {
        webPushService
          .sendCallNotification(calleeProfileId, callerPublicName, body.data.conversationId)
          .catch((err) => {
            fastify.log.error(err, 'Call push notification failed')
          })
      }

      return reply.code(200).send({
        success: true,
        conversationId: body.data.conversationId,
        roomName,
      })
    } catch (error: any) {
      fastify.log.error(error)
      return sendError(reply, 403, error?.error || 'Failed to initiate call')
    }
  })

  // POST /:conversationId/accept — accept an incoming call
  fastify.post(
    '/:conversationId/accept',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile not found.')

      const params = ConversationIdParamsSchema.safeParse(req.params)
      if (!params.success) return sendError(reply, 400, 'Invalid parameters')

      try {
        const conversation = await fastify.prisma.conversation.findUnique({
          where: { id: params.data.conversationId },
          include: { participants: true },
        })

        if (!conversation) return sendError(reply, 404, 'Conversation not found')

        const callerParticipant = conversation.participants.find((p) => p.profileId !== profileId)
        if (!callerParticipant) return sendError(reply, 404, 'Caller not found')

        broadcastToProfile(fastify, callerParticipant.profileId, {
          type: 'ws:call_accepted',
          payload: {
            conversationId: params.data.conversationId,
            roomName: conversation.jitsiRoomId,
          },
        })

        return reply.code(200).send({ success: true })
      } catch (error: any) {
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to accept call')
      }
    }
  )

  // POST /:conversationId/decline — decline an incoming call
  fastify.post(
    '/:conversationId/decline',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile not found.')

      const params = ConversationIdParamsSchema.safeParse(req.params)
      if (!params.success) return sendError(reply, 400, 'Invalid parameters')

      try {
        const conversation = await fastify.prisma.conversation.findUnique({
          where: { id: params.data.conversationId },
          include: {
            participants: {
              include: { profile: { include: { profileImages: true } } },
            },
          },
        })

        if (!conversation) return sendError(reply, 404, 'Conversation not found')

        const callerParticipant = conversation.participants.find((p) => p.profileId !== profileId)
        if (!callerParticipant) return sendError(reply, 404, 'Caller not found')

        // Send decline as generic "declined" to caller (looks same as timeout)
        broadcastToProfile(fastify, callerParticipant.profileId, {
          type: 'ws:call_declined',
          payload: { conversationId: params.data.conversationId },
        })

        // Insert missed call message and broadcast to both participants
        const missedMsg = await fastify.prisma.$transaction(async (tx) => {
          return await callService.insertMissedCallMessage(
            tx,
            params.data.conversationId,
            callerParticipant.profileId
          )
        })

        const messageDTO: MessageDTO = {
          id: missedMsg.id,
          conversationId: missedMsg.conversationId,
          senderId: missedMsg.senderId,
          content: missedMsg.content,
          messageType: missedMsg.messageType,
          createdAt: missedMsg.createdAt,
          sender: mapProfileSummary(callerParticipant.profile),
          attachment: null,
        }

        for (const p of conversation.participants) {
          broadcastToProfile(fastify, p.profileId, {
            type: 'ws:new_message',
            payload: messageDTO,
          })
        }

        return reply.code(200).send({ success: true })
      } catch (error: any) {
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to decline call')
      }
    }
  )

  // POST /:conversationId/cancel — caller cancels outgoing call
  fastify.post(
    '/:conversationId/cancel',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile not found.')

      const params = ConversationIdParamsSchema.safeParse(req.params)
      if (!params.success) return sendError(reply, 400, 'Invalid parameters')

      try {
        const conversation = await fastify.prisma.conversation.findUnique({
          where: { id: params.data.conversationId },
          include: {
            participants: {
              include: { profile: { include: { profileImages: true } } },
            },
          },
        })

        if (!conversation) return sendError(reply, 404, 'Conversation not found')

        const calleeParticipant = conversation.participants.find((p) => p.profileId !== profileId)
        if (!calleeParticipant) return sendError(reply, 404, 'Callee not found')

        const callerParticipant = conversation.participants.find((p) => p.profileId === profileId)
        if (!callerParticipant) return sendError(reply, 404, 'Caller not found')

        broadcastToProfile(fastify, calleeParticipant.profileId, {
          type: 'ws:call_cancelled',
          payload: { conversationId: params.data.conversationId },
        })

        // Insert missed call message and broadcast to both participants
        const missedMsg = await fastify.prisma.$transaction(async (tx) => {
          return await callService.insertMissedCallMessage(
            tx,
            params.data.conversationId,
            profileId
          )
        })

        const messageDTO: MessageDTO = {
          id: missedMsg.id,
          conversationId: missedMsg.conversationId,
          senderId: missedMsg.senderId,
          content: missedMsg.content,
          messageType: missedMsg.messageType,
          createdAt: missedMsg.createdAt,
          sender: mapProfileSummary(callerParticipant.profile),
          attachment: null,
        }

        for (const p of conversation.participants) {
          broadcastToProfile(fastify, p.profileId, {
            type: 'ws:new_message',
            payload: messageDTO,
          })
        }

        return reply.code(200).send({ success: true })
      } catch (error: any) {
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to cancel call')
      }
    }
  )

  // PATCH /:conversationId/callable — update callable status
  fastify.patch(
    '/:conversationId/callable',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile not found.')

      const params = ConversationIdParamsSchema.safeParse(req.params)
      if (!params.success) return sendError(reply, 400, 'Invalid parameters')

      const body = CallableBodySchema.safeParse(req.body)
      if (!body.success) return sendError(reply, 400, 'Invalid parameters')

      try {
        await callService.updateCallableStatus(
          params.data.conversationId,
          profileId,
          body.data.isCallable
        )
        return reply.code(200).send({ success: true })
      } catch (error: any) {
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to update callable status')
      }
    }
  )
}

export default callRoutes
