import type { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import { uploadTmpDir } from '@/lib/media'
import { ImageService } from '@/services/image.service'
import { sendError } from '../../helpers'

const UploadQuerySchema = z.object({ profileId: z.string().cuid() })

/**
 * Admin image upload used by external feed importers: stores an image owned by
 * `profileId` without attaching it, so the returned id can be passed as
 * `imageIds` to POST /admin/events.
 */
const adminImageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: appConfig.IMAGE_MAX_SIZE, files: 1, fields: 0 },
  })

  const imageService = ImageService.getInstance()

  /**
   * POST /?profileId=<cuid>
   * Multipart body with a single image file.
   * @returns {{ success, id }} 201
   */
  fastify.post('/', async (req, reply) => {
    const query = UploadQuerySchema.safeParse(req.query)
    if (!query.success) return sendError(reply, 400, 'profileId is required')
    const { profileId } = query.data

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    })
    if (!profile) return sendError(reply, 400, 'Unknown profileId')

    let files
    try {
      files = await req.saveRequestFiles({ tmpdir: uploadTmpDir() })
    } catch (err: any) {
      fastify.log.warn({ err }, 'Admin image upload error')
      const reason =
        err.code === 'FST_REQ_FILE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'IMAGE_UPLOAD_FAILED'
      return sendError(reply, 400, reason)
    }
    if (files.length === 0) return sendError(reply, 400, 'No file uploaded')
    const file = files[0]
    if (!file.mimetype.startsWith('image/')) {
      return sendError(reply, 400, 'Uploaded file must be an image')
    }

    try {
      const image = await imageService.createImage(profileId, file.filepath, '')
      return reply.code(201).send({ success: true, id: image.id })
    } catch (err) {
      fastify.log.error({ err }, 'Error storing admin image')
      return sendError(reply, 500, 'Failed to store image')
    }
  })
}

export default adminImageRoutes
