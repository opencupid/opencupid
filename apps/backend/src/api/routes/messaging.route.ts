import type WebSocket from 'ws'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { sendError } from '../helpers'
import { MessageService } from '@/services/messaging.service'
import { WebPushService } from '@/services/webpush.service'

import { z } from 'zod'
import {
  mapConversationParticipantToSummary,
  mapMessageDTO,
  mapMessageForMessageList,
} from '../mappers/messaging.mappers'
import type {
  MessagesResponse,
  ConversationsResponse,
  ConversationResponse,
  SendMessageResponse,
} from '@zod/apiResponse.dto'
import { broadcastToProfile } from '@/utils/wsUtils'
import { SendMessagePayloadSchema } from '@zod/messaging/messaging.dto'
import { InteractionService } from '../../services/interaction.service'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})


/**
 * Registers messaging-related routes for the Fastify server.
 *
 * This plugin provides endpoints for:
 * - Fetching messages in a conversation (`GET /:id`)
 * - Listing all conversations for the authenticated profile (`GET /conversations`)
 * - Marking a conversation as read (`POST /conversations/:id/mark-read`)
 * - Initiating a new conversation with a message (`POST /conversations/initiate`)
 * - Sending a message to an existing conversation (`POST /conversations/:id`)
 *
 * All routes require authentication via `fastify.authenticate`.
 * Handles request validation, error responses, and broadcasts new messages via WebSocket and web push notifications.
 *
 * @param fastify - The Fastify instance to decorate with messaging routes.
 */
const messageRoutes: FastifyPluginAsync = async fastify => {
  const messageService = MessageService.getInstance()
  const webPushService = WebPushService.getInstance()
  const interactionService = InteractionService.getInstance()

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 404, 'Profile not found.')

    const id = IdLookupParamsSchema.safeParse(req.params)
    if (!id.success) return sendError(reply, 404, 'Conversation not found')
    const conversationId = id.data.id

    try {
      const raw = await messageService.listMessagesForConversation(conversationId)

      const messages = raw.map(m => mapMessageForMessageList(m, profileId))
      const response: MessagesResponse = { success: true, messages }
      return reply.code(200).send(response)

    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to fetch conversations')
    }
  })

  fastify.get('/conversations', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 404, 'Profile not found.')

    try {
      const raw = await messageService.listConversationsForProfile(profileId)
      const conversations = raw.map(p => mapConversationParticipantToSummary(p, profileId))
      const response: ConversationsResponse = { success: true, conversations }
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to fetch conversations')
    }
  })

  /**
   * Marks a conversation as read.  
   * @param :id - conversation ID
   */
  fastify.post('/conversations/:id/mark-read', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile not found.')

    const id = IdLookupParamsSchema.safeParse(req.params)
    if (!id.success) return sendError(reply, 404, 'Conversation not found')
    const conversationId = id.data.id

    try {

      await messageService.markConversationRead(conversationId, profileId)
      const updated = await messageService.getConversationSummary(conversationId, profileId)
      if (!updated) return sendError(reply, 404, 'Conversation not found')

      const response: ConversationResponse = {
        success: true,
        conversation: mapConversationParticipantToSummary(updated, profileId),
      }
      return reply.code(200).send(response)

    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to mark conversation as read')
    }
  })

  fastify.post('/message', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const senderProfileId = req.session.profileId
    if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

    const body = SendMessagePayloadSchema.safeParse(req.body)
    if (!body.success) return sendError(reply, 401, 'Invalid parameters')

    const { profileId, content } = body.data

    try {
      const { convoId, message } = await fastify.prisma.$transaction(async (tx) => {
        return await messageService.sendOrStartConversation(
          tx,
          senderProfileId,
          profileId,
          content
        )
      })

      const conversation = await messageService.getConversationSummary(
        convoId,
        senderProfileId
      )
      if (conversation?.conversation.status !== 'INITIATED') {
        await interactionService.markMatchAsSeen(senderProfileId, profileId)
      }

      if (!conversation) {
        throw new Error('Conversation summary not found')
      }


      const messageDTO = mapMessageDTO(message, conversation)

      const response: SendMessageResponse = {
        success: true,
        conversation: mapConversationParticipantToSummary(conversation, senderProfileId),
        message: mapMessageForMessageList(messageDTO, senderProfileId),
      }

      reply.code(200).send(response)

      // Broadcast the new message to the recipient's WebSocket connections
      const ok = broadcastToProfile(fastify, profileId, {
        type: 'ws:new_message',
        payload: messageDTO,
      })

      webPushService.send(messageDTO)

    } catch (error: any) {
      return sendError(reply, 403, error)
    }

  })


}

export default messageRoutes
