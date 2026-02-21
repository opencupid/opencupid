import { FastifyPluginAsync } from 'fastify'
import path from 'path'
import { createReadStream } from 'fs'
import { promises as fsPromises } from 'fs'
import { sendError } from '../helpers'
import { appConfig } from '@/lib/appconfig'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Only allow safe filenames: alphanumeric, hyphens, underscores, and a single dot for extension
const safeFilenameSchema = z.string().regex(/^[\w-]+\.\w+$/, 'Invalid filename')

// Route params for media file lookups
const MediaParamsSchema = z.object({
  profileId: z.string().cuid(),
  filename: safeFilenameSchema,
})

const MIME_TYPE_MAP: Record<string, string> = {
  '.webm': 'audio/webm',
  '.mp4': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}

const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  // Serve voice message files - only accessible by conversation participants
  fastify.get(
    '/voice/:profileId/:filename',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const currentProfileId = req.session.profileId
      if (!currentProfileId) return sendError(reply, 401, 'Authentication required')

      const params = MediaParamsSchema.safeParse(req.params)
      if (!params.success) return sendError(reply, 400, 'Invalid parameters')

      const { profileId, filename } = params.data

      // Authorization: verify the requesting user is a participant in a conversation
      // that contains a message with this attachment
      const relativePath = `voice/${profileId}/${filename}`
      const attachment = await prisma.messageAttachment.findFirst({
        where: { filePath: relativePath },
        include: {
          message: {
            include: {
              conversation: {
                include: { participants: { select: { profileId: true } } },
              },
            },
          },
        },
      })

      if (!attachment) return sendError(reply, 404, 'Voice message not found')

      const isParticipant = attachment.message.conversation.participants.some(
        (p: { profileId: string }) => p.profileId === currentProfileId
      )
      if (!isParticipant) return sendError(reply, 403, 'Access denied')

      try {
        // Construct file path - safe because filename is validated by regex
        const filePath = path.join(appConfig.MEDIA_UPLOAD_DIR, 'voice', profileId, filename)

        // Check if file exists
        const stats = await fsPromises.stat(filePath).catch(() => null)
        if (!stats || !stats.isFile()) {
          return sendError(reply, 404, 'Voice message not found')
        }

        // Derive Content-Type from the attachment record or file extension
        const ext = path.extname(filename).toLowerCase()
        // Strip codec parameters (e.g. ";codecs=opus") — valid in HTML <source type> but not in HTTP Content-Type
        const rawMime = attachment.mimeType || MIME_TYPE_MAP[ext] || 'application/octet-stream'
        const contentType = rawMime.split(';')[0].trim()
        const fileSize = stats.size

        reply.header('Content-Type', contentType)
        reply.header('Accept-Ranges', 'bytes')

        // Handle byte-range requests (required for audio seeking and Safari playback)
        const rangeHeader = (req.headers as Record<string, string | undefined>)['range']
        if (rangeHeader) {
          const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/)
          if (!match) return sendError(reply, 416, 'Range Not Satisfiable')

          const start = match[1] ? parseInt(match[1], 10) : 0
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

          if (start > end || end >= fileSize) return sendError(reply, 416, 'Range Not Satisfiable')

          reply.status(206)
          reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
          reply.header('Content-Length', end - start + 1)
          return reply.send(createReadStream(filePath, { start, end }))
        }

        // Full file response
        reply.header('Content-Length', fileSize)
        return reply.send(createReadStream(filePath))
      } catch (error) {
        fastify.log.error('Error serving voice message:', error)
        return sendError(reply, 500, 'Failed to serve voice message')
      }
    }
  )
}

export default mediaRoutes
