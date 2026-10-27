import type { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import { uploadTmpDir } from '@/lib/media'
import { ImageService, ImageServiceError } from '@/services/image.service'
import { sendError } from '../../helpers'

const UploadQuerySchema = z.object({ profileId: z.string().cuid() })
const ImageParamsSchema = z.object({ id: z.string().cuid() })

/**
 * Admin image endpoints used by external feed importers: upload an image owned
 * by `profileId` without attaching it, so the returned id can be passed as
 * `imageIds` to POST /admin/events, and delete it again if that call fails.
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

  /**
   * DELETE /:id
   * Deletes an unattached image and its files regardless of its owner. Images
   * already in a gallery are refused, so a cleanup after an ambiguous failure
   * can never strip images from content that was in fact created.
   * @returns {{ success }} 200, 404 when not found, 409 when attached
   */
  fastify.delete('/:id', async (req, reply) => {
    const params = ImageParamsSchema.safeParse(req.params)
    if (!params.success) return sendError(reply, 400, 'Invalid image id')
    const { id } = params.data

    const image = await prisma.image.findUnique({
      where: { id },
      select: {
        ownerProfileId: true,
        profileGallery: { select: { imageId: true } },
        userContentGallery: { select: { imageId: true } },
        messageGallery: { select: { imageId: true } },
      },
    })
    if (!image) return sendError(reply, 404, 'Image not found')
    if (image.profileGallery || image.userContentGallery || image.messageGallery) {
      return sendError(reply, 409, 'Image is attached')
    }

    try {
      await imageService.deleteImage(id, image.ownerProfileId)
      return reply.code(200).send({ success: true })
    } catch (err) {
      if (err instanceof ImageServiceError && err.code === 'NOT_FOUND') {
        return sendError(reply, 404, 'Image not found')
      }
      fastify.log.error({ err }, 'Error deleting admin image')
      return sendError(reply, 500, 'Failed to delete image')
    }
  })
}

export default adminImageRoutes
