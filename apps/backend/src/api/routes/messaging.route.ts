import type WebSocket from 'ws'
import { FastifyPluginAsync } from 'fastify'
import { sendError } from '../helpers'
import { MessageService } from '@/services/messaging.service'
import { WebPushService } from '@/services/webpush.service'

import { z } from 'zod'
import {
  mapConversationParticipantToSummary,
  mapMessageDTO,
  mapMessageForMessageList,
} from '../messaging.mappers'
import type {
  MessagesResponse,
  ConversationsResponse,
  ConversationResponse,
  SendMessageResponse,
  InitiateConversationResponse,
} from '@shared/dto/apiResponse.dto'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})

const ReplyToConversationParamsSchema = z.object({
  content: z.string().min(1),
})

const InitiateConversationParamsSchema = z.object({
  profileId: z.string().cuid(),
  content: z.string().min(1),
})

function broadcastToProfile(
  fastify: any,
  recipientProfileId: string,
  payload: Record<string, any>
) {
  const sockets = fastify.connections?.get(recipientProfileId)
  if (!sockets || sockets.size === 0) {
    fastify.log.warn(`No active WebSocket connections for recipient ${recipientProfileId}`)
    return false
  }
  sockets.forEach((socket: WebSocket) => {
    if (socket?.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  })
  return true
}




const messageRoutes: FastifyPluginAsync = async fastify => {
  const messageService = MessageService.getInstance()
  const webPushService = WebPushService.getInstance()

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

  /**
  * Initiates a conversation.  
  * @param :id - recipient profile ID
  */
  fastify.post('/conversations/initiate', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const senderProfileId = req.session.profileId
    if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

    const body = InitiateConversationParamsSchema.safeParse(req.body)
    if (!body.success) return sendError(reply, 401, 'Invalid parameters')

    const { profileId, content } = body.data

    try {
      const { conversation, message } = await messageService.initiateConversation(
        senderProfileId,
        profileId,
        content
      )
      const messageDTO = mapMessageDTO(message, conversation)

      const response: InitiateConversationResponse = {
        success: true,
      }

      reply.code(200).send(response)

      // Broadcast the new message to the recipient's WebSocket connections
      const ok = broadcastToProfile(fastify, profileId, {
        type: 'new_message',
        payload: messageDTO,
      })

      webPushService.send(messageDTO)

    } catch (error: any) {
      return sendError(reply, 403, error)
    }

  })

  /**
   * Send a message to an existing conversation.  
   * @param :id - conversation ID
   */
  fastify.post('/conversations/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const senderProfileId = req.session.profileId
    if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

    const params = IdLookupParamsSchema.safeParse(req.params)
    if (!params.success) return sendError(reply, 401, 'Recipient ID not found')
    const { id } = params.data

    const body = ReplyToConversationParamsSchema.safeParse(req.body)
    if (!body.success) return sendError(reply, 401, 'Invalid message body')
    const { content } = body.data

    try {
      const { conversation, message } = await messageService.replyInConversation(senderProfileId, id, content)
      const messageDTO = mapMessageDTO(message, conversation)
      const convoSummary = mapConversationParticipantToSummary(conversation, senderProfileId)

      const response: SendMessageResponse = {
        success: true,
        conversation: convoSummary,
        message: mapMessageForMessageList(messageDTO, senderProfileId),
      }

      reply.code(200).send(response)

      // Broadcast the new message to the recipient's WebSocket connections
      const ok = broadcastToProfile(fastify, convoSummary.partnerProfile.id, {
        type: 'new_message',
        payload: messageDTO,
      })

      webPushService.send(messageDTO)
    } catch (error: any) {
      return sendError(reply, 403, 'You are not allowed to send messages to this recipient')
    }
  })
}

export default messageRoutes
