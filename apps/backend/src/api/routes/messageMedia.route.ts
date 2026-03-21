import { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import { rateLimitConfig, sendError } from '../helpers'
import { MessageService, cleanMessageForNotification } from '@/services/messaging.service'
import { WebPushService } from '@/services/webpush.service'

import { mapConversationParticipantToSummary, mapMessageToDTO } from '../mappers/messaging.mappers'
import type { SendMessageResponse } from '@zod/apiResponse.dto'
import { broadcastToProfile } from '@/utils/wsUtils'
import {
  SendVoiceMessagePayloadSchema,
  SendImageMessagePayloadSchema,
} from '@zod/messaging/messaging.dto'
import { InteractionService } from '../../services/interaction.service'
import { notifierService } from '@/services/notifier.service'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'
import { MEDIA_SUBDIR } from '@/lib/media'
import path from 'path'
import { promises as fsPromises } from 'fs'
import { transcodeToMp3 } from '@/services/audioTranscoder'
import { MessageImageService } from '@/services/messageImage.service'
import cuid from 'cuid'

/**
 * Registers media-upload routes for messages (voice and image).
 *
 * This plugin provides:
 * - `POST /voice` — Upload a voice message
 * - `POST /image` — Upload an image message
 *
 * Both endpoints require authentication and use multipart/form-data uploads.
 *
 * @param fastify - The Fastify instance to decorate with routes.
 */
const messageMediaRoutes: FastifyPluginAsync = async (fastify) => {
  // Use the larger of voice and image size limits for multipart
  const voiceFileSize = Math.ceil(appConfig.VOICE_MESSAGE_MAX_DURATION * 48000 * 2 * 2 * 1.1)
  const maxFileSize = Math.max(voiceFileSize, appConfig.IMAGE_MESSAGE_MAX_SIZE)

  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000,
      fields: 10,
      fileSize: maxFileSize,
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

  const messageService = MessageService.getInstance()
  const webPushService = WebPushService.getInstance()
  const interactionService = InteractionService.getInstance()
  const messageImageService = MessageImageService.getInstance()

  /**
   * Broadcast a new message to the recipient and fall back to push/notification.
   */
  async function broadcastAndNotify(
    recipientProfileId: string,
    messageDTO: ReturnType<typeof mapMessageToDTO>,
    notificationMessage: string
  ) {
    const isWsBroadcasted = broadcastToProfile(fastify, recipientProfileId, {
      type: 'ws:new_message',
      payload: messageDTO,
    })

    if (!isWsBroadcasted) {
      if (WebPushService.isWebPushConfigured()) {
        webPushService.send(messageDTO, recipientProfileId).catch((err) => {
          fastify.log.error(err, 'Web push failed')
        })
      }
      await notifierService.notifyProfile(recipientProfileId, 'new_message', {
        sender: messageDTO.sender.publicName,
        message: notificationMessage,
        link: `${appConfig.FRONTEND_URL}/inbox`,
      })
    }
  }

  // Voice message upload endpoint
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
          const { convoId, message, isDuplicate } = await fastify.prisma.$transaction(
            async (tx) => {
              return await messageService.sendOrStartConversation(
                tx,
                senderProfileId,
                payload.data.profileId,
                payload.data.content,
                'audio/voice',
                {
                  filePath: `${MEDIA_SUBDIR.VOICE}/${senderProfileId}/${finalFileName}`,
                  mimeType: finalMimeType,
                  fileSize: finalSize,
                  duration: payload.data.duration,
                }
              )
            }
          )

          const conversation = await messageService.getConversationSummary(convoId, senderProfileId)

          if (!isDuplicate) {
            await interactionService.markMatchAsSeen(senderProfileId, payload.data.profileId)
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
          }

          reply.code(200).send(response)

          if (!isDuplicate) {
            const recipientProfile = await fastify.prisma.profile.findUnique({
              where: { id: payload.data.profileId },
              select: { user: { select: { language: true } } },
            })
            const t = i18next.getFixedT(recipientProfile?.user?.language || 'en')
            await broadcastAndNotify(
              payload.data.profileId,
              messageDTO,
              t('notifications.voice_message_sent')
            )
          }
        } catch (error: any) {
          // Clean up file if message creation fails
          await fsPromises.unlink(finalPath).catch(() => {})
          return sendError(reply, 403, error)
        }
      } catch (err: any) {
        fastify.log.warn('Voice upload error:', err)
        return sendError(reply, 400, 'Failed to upload voice message')
      }
    }
  )

  // Image message upload endpoint
  fastify.post(
    '/image',
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
            fileBuffer = await part.toBuffer()
            fileMeta = {
              filename: part.filename,
              mimetype: part.mimetype,
              fieldname: part.fieldname,
            }
          } else {
            fields[part.fieldname] = part.value
          }
        }

        if (!fileBuffer || !fileMeta) {
          return sendError(reply, 400, 'No image file provided')
        }

        // Validate file size
        if (fileBuffer.length > appConfig.IMAGE_MESSAGE_MAX_SIZE) {
          return sendError(reply, 400, 'Image file too large')
        }

        const meta = fileMeta

        // Validate image message payload
        const payload = SendImageMessagePayloadSchema.safeParse({
          profileId: fields.profileId,
          content: '',
          messageType: 'image/webp',
        })

        if (!payload.success) {
          return sendError(reply, 400, 'Invalid image message parameters')
        }

        // Validate file type
        const baseMimeType = meta.mimetype.split(';')[0].trim()
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedMimeTypes.includes(baseMimeType)) {
          return sendError(reply, 400, 'Invalid image file type')
        }

        // Generate unique slug for the base filename
        const slug = `${Date.now()}-${cuid.slug()}`
        // filePath stored in DB as base path without variant suffix
        const dbFilePath = `${MEDIA_SUBDIR.MESSAGE_IMAGES}/${senderProfileId}/${slug}`

        let inlinePath: string | null = null
        let fullPath: string | null = null

        try {
          const result = await messageImageService.processMessageImage(
            fileBuffer,
            senderProfileId,
            slug
          )
          inlinePath = result.inlinePath
          fullPath = result.fullPath
          const totalSize = result.inlineSize + result.fullSize

          const { convoId, message, isDuplicate } = await fastify.prisma.$transaction(
            async (tx) => {
              return await messageService.sendOrStartConversation(
                tx,
                senderProfileId,
                payload.data.profileId,
                payload.data.content,
                'image/webp',
                {
                  filePath: dbFilePath,
                  mimeType: 'image/webp',
                  fileSize: totalSize,
                  duration: null,
                }
              )
            }
          )

          const conversation = await messageService.getConversationSummary(convoId, senderProfileId)

          if (!isDuplicate) {
            await interactionService.markMatchAsSeen(senderProfileId, payload.data.profileId)
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
          }

          reply.code(200).send(response)

          if (!isDuplicate) {
            const recipientProfile = await fastify.prisma.profile.findUnique({
              where: { id: payload.data.profileId },
              select: { user: { select: { language: true } } },
            })
            const t = i18next.getFixedT(recipientProfile?.user?.language || 'en')
            await broadcastAndNotify(
              payload.data.profileId,
              messageDTO,
              t('notifications.image_message_sent')
            )
          }
        } catch (error: any) {
          // Clean up generated image files if message creation fails
          if (inlinePath) await fsPromises.unlink(inlinePath).catch(() => {})
          if (fullPath) await fsPromises.unlink(fullPath).catch(() => {})
          return sendError(reply, 403, error)
        }
      } catch (err: any) {
        fastify.log.warn('Image upload error:', err)
        return sendError(reply, 400, 'Failed to upload image message')
      }
    }
  )
}

export default messageMediaRoutes
