import { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import { rateLimitConfig, sendError } from '../helpers'
import {
  MessageService,
  MessagingError,
  MessagingErrorCodes,
  cleanMessageForNotification,
  type MessagingErrorCode,
} from '@/services/messaging.service'
import { computeSendOutcome } from '@/services/messaging.stateMachine'
import { WebPushService } from '@/services/webpush.service'

import { z } from 'zod'
import { mapConversationParticipantToSummary, mapMessageToDTO } from '../mappers/messaging.mappers'
import type {
  MessagesResponse,
  ConversationsResponse,
  ConversationResponse,
  SendMessageResponse,
} from '@zod/apiResponse.dto'
import { broadcastToProfile } from '@/utils/wsUtils'
import {
  SendMessagePayloadSchema,
  SendVoiceMessagePayloadSchema,
} from '@zod/messaging/messaging.dto'
import type { MessageDTO } from '@zod/messaging/messaging.dto'
import { InteractionService } from '@/services/interaction.service'
import { notifierService } from '@/services/notifier.service'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'
import { MEDIA_SUBDIR } from '@/lib/media'
import path from 'path'
import { promises as fsPromises } from 'fs'
import { transcodeToMp3 } from '@/services/audioTranscoder'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})

const MessageListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
})

// HTTP status policy for MessagingError codes lives at the route layer, not
// the service. Keeping it exhaustive (Record<...>) makes adding a new code a
// compile error until the mapping is provided.
const MESSAGING_ERROR_STATUS: Record<MessagingErrorCode, number> = {
  [MessagingErrorCodes.CONVERSATION_BLOCKED]: 403,
  [MessagingErrorCodes.EMPTY_MESSAGE]: 400,
}

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // Calculate max file size from configured max duration.
  // WAV at 48kHz, 16-bit, stereo = duration × 48000 × 2 bytes/sample × 2 channels + 10% buffer
  const voiceFileSize = Math.ceil(appConfig.VOICE_MESSAGE_MAX_DURATION * 48000 * 2 * 2 * 1.1)

  // Register multipart support for voice message uploads
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000,
      fields: 10,
      fileSize: voiceFileSize,
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

  const messageService = MessageService.getInstance()
  const webPushService = WebPushService.getInstance()
  const interactionService = InteractionService.getInstance()

  /*
   * Owns Phases 1 + 2 shared by /message and /voice: the resolve → classify →
   * accept → send transaction, plus the post-tx summary lookup, match-seen
   * side-effect, DTO mapping, and response assembly. Throws on 'blocked' so
   * the handler's catch maps to a 403.
   */
  async function sendAndBuildResponse(input: {
    senderProfileId: string
    recipientProfileId: string
    content: string
    messageType: string
    attachment?: {
      filePath: string
      mimeType: string
      fileSize?: number
      duration?: number
    }
  }): Promise<{ response: SendMessageResponse; messageDTO: MessageDTO; isDuplicate: boolean }> {
    const { senderProfileId, recipientProfileId, content, messageType, attachment } = input

    const { convoId, message, isDuplicate, outcome } = await fastify.prisma.$transaction(
      async (tx) => {
        const { convo, wasCreated } = await messageService.resolveConversation(
          tx,
          senderProfileId,
          recipientProfileId
        )
        const outcome = computeSendOutcome(convo, wasCreated, senderProfileId)

        if (outcome === 'blocked') {
          throw new MessagingError(
            MessagingErrorCodes.CONVERSATION_BLOCKED,
            'Cannot send in this conversation'
          )
        }

        if (outcome === 'accepted_on_reply') {
          await messageService.acceptConversationOnReply(tx, convo.id)
        }

        const sendResult = await messageService.sendMessage(
          tx,
          convo.id,
          senderProfileId,
          content,
          messageType,
          attachment
        )

        return {
          convoId: convo.id,
          message: sendResult.message,
          isDuplicate: sendResult.isDuplicate,
          outcome,
        }
      }
    )

    const conversation = await messageService.getConversationSummary(convoId, senderProfileId)

    if (outcome === 'new_conversation') {
      await interactionService.markMatchAsSeen(senderProfileId, recipientProfileId)
    }

    if (!conversation) {
      throw new Error('Conversation summary not found')
    }

    const messageDTO = mapMessageToDTO(message)
    const messageWithMine = mapMessageToDTO(message, senderProfileId)

    const response: SendMessageResponse = {
      success: true,
      conversation: mapConversationParticipantToSummary(conversation, senderProfileId),
      message: messageWithMine,
      outcome,
    }

    return { response, messageDTO, isDuplicate }
  }

  /*
   * Fans out a newly-written message to the recipient: WebSocket broadcast
   * first, and only if that misses do we fall back to webpush + email. The
   * email body is built by the caller so /message can do sync markdown
   * cleaning and /voice can do the async language lookup + i18n.
   *
   * The findUnique + i18n work in the voice callback only runs when the WS
   * broadcast misses, preserving the "recipient online → no email lookup"
   * optimization from the original code.
   */
  async function fireNewMessageNotifications(args: {
    senderProfileId: string
    recipientProfileId: string
    messageDTO: MessageDTO
    buildEmailBody: () => Promise<string>
  }): Promise<void> {
    const { senderProfileId, recipientProfileId, messageDTO, buildEmailBody } = args

    const isWsBroadcasted = broadcastToProfile(fastify, recipientProfileId, {
      type: 'ws:new_message',
      payload: messageDTO,
    })

    if (isWsBroadcasted) return

    if (WebPushService.isWebPushConfigured()) {
      webPushService.send(messageDTO, recipientProfileId).catch((err) => {
        fastify.log.error(err, 'Web push failed')
      })
    }

    await notifierService.notifyProfile(recipientProfileId, 'new_message', {
      senderId: senderProfileId,
      sender: messageDTO.sender.publicName,
      message: await buildEmailBody(),
      link: `${appConfig.FRONTEND_URL}/inbox`,
    })
  }

  /**
   * GET /:id
   * Returns paginated messages for a conversation, with cursor-based pagination.
   * @param {string} id - Conversation ID (CUID)
   * @query {string} [cursor] - Message ID to paginate from
   * @query {number} [take] - Number of messages to return (1–50)
   * @returns {MessagesResponse} { messages, nextCursor, hasMore }
   */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 404, 'Profile not found.')

    const id = IdLookupParamsSchema.safeParse(req.params)
    if (!id.success) return sendError(reply, 404, 'Conversation not found')
    const conversationId = id.data.id

    const query = MessageListQuerySchema.safeParse(req.query ?? {})
    if (!query.success) return sendError(reply, 400, 'Invalid query parameters')

    try {
      const {
        messages: raw,
        nextCursor,
        hasMore,
      } = await messageService.listMessagesForConversation(conversationId, {
        cursor: query.data.cursor,
        take: query.data.take,
      })

      const messages = raw.map((m) => mapMessageToDTO(m, profileId))
      const response: MessagesResponse = { success: true, messages, nextCursor, hasMore }
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to fetch conversations')
    }
  })

  /**
   * GET /conversations
   * Returns all conversations for the authenticated profile with latest message summaries.
   * @returns {ConversationsResponse}
   */
  fastify.get('/conversations', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 404, 'Profile not found.')

    try {
      const raw = await messageService.listConversationsForProfile(profileId)
      const conversations = raw.map((p) => mapConversationParticipantToSummary(p, profileId))
      const response: ConversationsResponse = { success: true, conversations }
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to fetch conversations')
    }
  })

  /**
   * POST /conversations/:id/mark-read
   * Marks all messages in a conversation as read for the current profile.
   * @param {string} id - Conversation ID (CUID)
   * @returns {ConversationResponse} Updated conversation summary
   */
  fastify.post(
    '/conversations/:id/mark-read',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
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
    }
  )

  /**
   * POST /message
   * Sends a text message. Creates a new conversation if one doesn't exist with the recipient.
   * Notifies the recipient via WebSocket, or falls back to web push + email if offline.
   * @body {string} profileId - Recipient profile ID
   * @body {string} content - Message text
   * @returns {SendMessageResponse} { conversation, message }
   */
  fastify.post(
    '/message',
    { onRequest: [fastify.authenticate], config: rateLimitConfig(fastify, '1 minute', 1) },
    async (req, reply) => {
      const senderProfileId = req.session.profileId
      if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

      const body = SendMessagePayloadSchema.safeParse(req.body)
      if (!body.success) return sendError(reply, 401, 'Invalid parameters')

      const { profileId, content } = body.data

      try {
        const { response, messageDTO, isDuplicate } = await sendAndBuildResponse({
          senderProfileId,
          recipientProfileId: profileId,
          content,
          messageType: 'text/plain',
        })

        reply.code(200).send(response)

        if (!isDuplicate) {
          await fireNewMessageNotifications({
            senderProfileId,
            recipientProfileId: profileId,
            messageDTO,
            buildEmailBody: async () => cleanMessageForNotification(messageDTO.content, 100),
          })
        }
      } catch (error) {
        if (error instanceof MessagingError) {
          return sendError(reply, MESSAGING_ERROR_STATUS[error.code], error.message)
        }
        throw error
      }
    }
  )

  /**
   * POST /voice
   * Uploads and sends a voice message (multipart form data).
   * Accepts audio files (mpeg, mp4, wav, webm, ogg). WAV is transcoded to MP3.
   * Creates a conversation if one doesn't exist with the recipient.
   * @body {string} profileId - Recipient profile ID (form field)
   * @body {string} [content] - Optional text caption (form field)
   * @body {number} duration - Audio duration in seconds (form field)
   * @body {File} file - Audio file (multipart file field)
   * @returns {SendMessageResponse} { conversation, message }
   */
  fastify.post(
    '/voice',
    { onRequest: [fastify.authenticate], config: rateLimitConfig(fastify, '1 minute', 10) },
    async (req, reply) => {
      const senderProfileId = req.session.profileId
      if (!senderProfileId) return sendError(reply, 401, 'Sender ID not found.')

      let fileBuffer: Buffer | null = null
      let fileMeta: { filename: string; mimetype: string; fieldname: string } | null = null
      let fields: any = {}

      try {
        // Process multipart form data
        const parts = req.parts()

        for await (const part of parts) {
          if (part.type === 'file') {
            fileBuffer = await part.toBuffer() // consumes stream, unblocks next parts
            fileMeta = {
              filename: part.filename,
              mimetype: part.mimetype,
              fieldname: part.fieldname,
            }
          } else {
            // Handle form fields
            fields[part.fieldname] = part.value
          }
        }

        if (!fileBuffer || !fileMeta) {
          return sendError(reply, 400, 'No voice file provided')
        }

        // fileMeta is guaranteed non-null after the check above; bind to a const
        // so TypeScript narrows the type for the rest of the scope.
        const meta = fileMeta

        // Validate voice message payload
        const payload = SendVoiceMessagePayloadSchema.safeParse({
          profileId: fields.profileId,
          content: fields.content || '',
          messageType: 'audio/voice',
          duration: Number(fields.duration) || 0,
        })

        if (!payload.success) {
          return sendError(reply, 400, 'Invalid voice message parameters')
        }

        // Validate file type (strip codec suffix before allowlist check)
        const baseMimeType = meta.mimetype.split(';')[0].trim()
        const allowedMimeTypes = [
          'audio/mpeg',
          'audio/mp4',
          'audio/wav',
          'audio/wave',
          'audio/webm',
          'audio/ogg',
        ]
        if (!allowedMimeTypes.includes(baseMimeType)) {
          return sendError(reply, 400, 'Invalid audio file type')
        }

        // Validate duration
        if (payload.data.duration > appConfig.VOICE_MESSAGE_MAX_DURATION) {
          return sendError(
            reply,
            400,
            `Voice message too long. Maximum duration is ${appConfig.VOICE_MESSAGE_MAX_DURATION} seconds`
          )
        }

        // Create voice directory if it doesn't exist
        const voiceDir = path.join(appConfig.MEDIA_UPLOAD_DIR, MEDIA_SUBDIR.VOICE, senderProfileId)
        await fsPromises.mkdir(voiceDir, { recursive: true })

        // Generate unique filename
        const fileExtension = path.extname(meta.filename) || '.webm'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}${fileExtension}`
        const filePath = path.join(voiceDir, fileName)

        // Save the buffered file to disk
        await fsPromises.writeFile(filePath, fileBuffer)

        // Transcode WAV to MP3 for smaller size and universal browser compatibility
        let finalPath = filePath
        let finalFileName = fileName
        let finalMimeType = meta.mimetype
        let finalSize: number

        if (baseMimeType === 'audio/wav' || baseMimeType === 'audio/wave') {
          const result = await transcodeToMp3(filePath)
          finalPath = result.path
          finalFileName = path.basename(result.path)
          finalMimeType = 'audio/mpeg'
          finalSize = result.size
        } else {
          const stats = await fsPromises.stat(filePath)
          finalSize = stats.size
        }

        try {
          const { response, messageDTO, isDuplicate } = await sendAndBuildResponse({
            senderProfileId,
            recipientProfileId: payload.data.profileId,
            content: payload.data.content,
            messageType: 'audio/voice',
            attachment: {
              filePath: `${MEDIA_SUBDIR.VOICE}/${senderProfileId}/${finalFileName}`,
              mimeType: finalMimeType,
              fileSize: finalSize,
              duration: payload.data.duration,
            },
          })

          reply.code(200).send(response)

          if (!isDuplicate) {
            await fireNewMessageNotifications({
              senderProfileId,
              recipientProfileId: payload.data.profileId,
              messageDTO,
              buildEmailBody: async () => {
                const recipientProfile = await fastify.prisma.profile.findUnique({
                  where: { id: payload.data.profileId },
                  select: { user: { select: { language: true } } },
                })
                return i18next.getFixedT(recipientProfile?.user?.language || 'en')(
                  'notifications.voice_message_sent'
                )
              },
            })
          }
        } catch (error) {
          await fsPromises.unlink(finalPath).catch(() => {})
          if (error instanceof MessagingError) {
            return sendError(reply, MESSAGING_ERROR_STATUS[error.code], error.message)
          }
          // Don't let the outer 400 catch swallow a send-path failure — that
          // catch is scoped to upload/transcode problems only.
          fastify.log.error(error, 'Voice message send failed')
          return sendError(reply, 500, 'Failed to send voice message')
        }
      } catch (err: any) {
        fastify.log.warn('Voice upload error:', err)
        return sendError(reply, 400, 'Failed to upload voice message')
      }
    }
  )
}

export default messageRoutes
