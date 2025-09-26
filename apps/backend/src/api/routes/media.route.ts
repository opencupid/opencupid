import { FastifyPluginAsync } from 'fastify'
import path from 'path'
import fs, { createReadStream } from 'fs'
import { promises as fsPromises } from 'fs'
import { sendError } from '../helpers'
import { appConfig } from '@/lib/appconfig'
import { z } from 'zod'

// Route params for media file lookups
const MediaParamsSchema = z.object({
  profileId: z.string().cuid(),
  filename: z.string(),
})

const mediaRoutes: FastifyPluginAsync = async fastify => {
  
  // Serve voice message files - only accessible by authenticated users
  fastify.get('/voice/:profileId/:filename', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const currentProfileId = req.session.profileId
    if (!currentProfileId) return sendError(reply, 401, 'Authentication required')

    const params = MediaParamsSchema.safeParse(req.params)
    if (!params.success) return sendError(reply, 400, 'Invalid parameters')

    const { profileId, filename } = params.data

    try {
      // Construct file path
      const filePath = path.join(appConfig.MEDIA_UPLOAD_DIR, 'voice', profileId, filename)
      
      // Check if file exists
      const stats = await fsPromises.stat(filePath).catch(() => null)
      if (!stats || !stats.isFile()) {
        return sendError(reply, 404, 'Voice message not found')
      }

      // TODO: Add authorization check - only allow users who are part of the conversation
      // For now, any authenticated user can access voice messages
      // This should be improved to check if the user has access to the specific conversation

      // Set appropriate headers
      reply.header('Content-Type', 'audio/webm')
      reply.header('Content-Length', stats.size)
      reply.header('Accept-Ranges', 'bytes')
      
      // Send the file
      const stream = createReadStream(filePath)
      return reply.send(stream)

    } catch (error) {
      fastify.log.error('Error serving voice message:', error)
      return sendError(reply, 500, 'Failed to serve voice message')
    }
  })
}

export default mediaRoutes