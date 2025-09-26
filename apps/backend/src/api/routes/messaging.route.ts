import {  FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
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
import { SendMessagePayloadSchema, SendVoiceMessagePayloadSchema } from '@zod/messaging/messaging.dto'
import { InteractionService } from '../../services/interaction.service'
import { notifierService } from '@/services/notifier.service'
import { appConfig } from '@/lib/appconfig'
import path from 'path'
import fs, { createWriteStream } from 'fs'
import { promises as fsPromises } from 'fs'

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
  // Register multipart support for voice message uploads
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000,
      fields: 10,
      fileSize: 10 * 1024 * 1024, // 10MB max for voice files
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

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

    const { profileId, content, messageType } = body.data

    try {
      const { convoId, message } = await fastify.prisma.$transaction(async (tx) => {
        return await messageService.sendOrStartConversation(
          tx,
          senderProfileId,
          profileId,
          content,
          messageType
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
      const isWsBroadcasted = broadcastToProfile(fastify, profileId, {
        type: 'ws:new_message',
        payload: messageDTO,
      })

      if (!isWsBroadcasted) {
        await notifierService.notifyProfile(profileId, 'new_message', {
          sender: messageDTO.sender.publicName,
          message: messageDTO.content,
          link: `${appConfig.FRONTEND_URL}/inbox`,
        })
      // webPushService.send(messageDTO)
      }
    } catch (error: any) {
      return sendError(reply, 403, error)
    }

  })

  // Voice message upload endpoint
  fastify.post('/voice', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const senderProfileId = req.session.profileId
    if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

    let files: any[] = []
    let fields: any = {}

    try {
      // Process multipart form data
      const parts = req.parts()
      
      for await (const part of parts) {
        if (part.type === 'file') {
          files = [part]
        } else {
          // Handle form fields
          fields[part.fieldname] = part.value
        }
      }

      if (!files || files.length === 0) {
        return sendError(reply, 400, 'No voice file provided')
      }

      const file = files[0]

      // Validate voice message payload
      const payload = SendVoiceMessagePayloadSchema.safeParse({
        profileId: fields.profileId,
        content: fields.content || '',
        messageType: 'audio/voice',
        duration: parseInt(fields.duration),
      })

      if (!payload.success) {
        return sendError(reply, 400, 'Invalid voice message parameters')
      }

      // Validate file type
      const allowedMimeTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return sendError(reply, 400, 'Invalid audio file type')
      }

      // Validate duration
      if (payload.data.duration > appConfig.VOICE_MESSAGE_MAX_DURATION) {
        return sendError(reply, 400, `Voice message too long. Maximum duration is ${appConfig.VOICE_MESSAGE_MAX_DURATION} seconds`)
      }

      // Create voice directory if it doesn't exist
      const voiceDir = path.join(appConfig.MEDIA_UPLOAD_DIR, 'voice', senderProfileId)
      await fsPromises.mkdir(voiceDir, { recursive: true })

      // Generate unique filename
      const fileExtension = path.extname(file.filename) || '.webm'
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`
      const filePath = path.join(voiceDir, fileName)

      // Save the file
      await file.file.pipe(createWriteStream(filePath))

      // Get file stats
      const stats = await fsPromises.stat(filePath)

      try {
        const { convoId, message } = await fastify.prisma.$transaction(async (tx) => {
          return await messageService.sendOrStartConversation(
            tx,
            senderProfileId,
            payload.data.profileId,
            payload.data.content,
            'audio/voice',
            {
              filePath: `voice/${senderProfileId}/${fileName}`,
              mimeType: file.mimetype,
              fileSize: stats.size,
              duration: payload.data.duration,
            }
          )
        })

        const conversation = await messageService.getConversationSummary(
          convoId,
          senderProfileId
        )

        if (conversation?.conversation.status !== 'INITIATED') {
          await interactionService.markMatchAsSeen(senderProfileId, payload.data.profileId)
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

        // Broadcast the new voice message to the recipient's WebSocket connections
        const isWsBroadcasted = broadcastToProfile(fastify, payload.data.profileId, {
          type: 'ws:new_message',
          payload: messageDTO,
        })

        if (!isWsBroadcasted) {
          await notifierService.notifyProfile(payload.data.profileId, 'new_message', {
            sender: messageDTO.sender.publicName,
            message: 'Sent a voice message',
            link: `${appConfig.FRONTEND_URL}/inbox`,
          })
        }
      } catch (error: any) {
        // Clean up file if message creation fails
        await fsPromises.unlink(filePath).catch(() => {})
        return sendError(reply, 403, error)
      }

    } catch (err: any) {
      fastify.log.warn('Voice upload error:', err)
      return sendError(reply, 400, 'Failed to upload voice message')
    }
  })


}

export default messageRoutes
