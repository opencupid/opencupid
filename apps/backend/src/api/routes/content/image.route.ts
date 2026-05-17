import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService, ImageServiceError } from '@/services/image.service'
import { prisma } from '@/lib/prisma'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError } from '../../helpers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse } from '@zod/image/image.dto'
import { toOwnerImage } from '@/api/mappers/image.mappers'

const ContentParamsSchema = z.object({ contentId: z.string().cuid() })

const contentImageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: appConfig.IMAGE_MAX_SIZE,
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

  const imageService = ImageService.getInstance()

  /**
   * GET /:contentId/image
   * Owner view of the content gallery.
   */
  fastify.get('/:contentId/image', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { contentId } = ContentParamsSchema.parse(req.params)
    try {
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }
      const images = await imageService.listUserContentGallery(contentId)
      const response: ImageApiResponse = {
        success: true,
        images: images.map(toOwnerImage),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch content images')
    }
  })

  /**
   * POST /:contentId/image
   * Uploads an image and attaches it to a UserContent gallery. Owner-only.
   * Same compensating-delete pattern as POST /image (route layer).
   */
  fastify.post(
    '/:contentId/image',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const { contentId } = ContentParamsSchema.parse(req.params)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }

      let files
      try {
        files = await req.saveRequestFiles({
          tmpdir: uploadTmpDir(),
          limits: { fileSize: appConfig.IMAGE_MAX_SIZE, files: 1, fields: 1 },
        })
      } catch (err: any) {
        fastify.log.warn('Upload error:', err, err.code)
        const reason =
          err.code === 'FST_REQ_FILE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'IMAGE_UPLOAD_FAILED'
        return sendError(reply, 400, reason)
      }

      if (files.length === 0) return sendError(reply, 400, 'No file uploaded')
      const fileUpload = files[0]
      if (!fileUpload.mimetype.startsWith('image/')) {
        return sendError(reply, 400, 'Uploaded file must be an image')
      }

      const captionText = ((
        (Array.isArray(fileUpload.fields.captionText)
          ? fileUpload.fields.captionText[0]
          : fileUpload.fields.captionText) as MultipartValue
      ).value ?? '') as string

      let createdId: string | null = null
      try {
        const created = await imageService.createImage(
          req.session.profileId,
          fileUpload.filepath,
          captionText
        )
        createdId = created.id
        await imageService.attachToUserContent(created.id, contentId)
        const updated = await imageService.listUserContentGallery(contentId)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing content image')
        if (createdId) {
          try {
            await imageService.deleteImage(createdId, req.session.profileId)
          } catch (cleanupErr) {
            fastify.log.error(
              { err: cleanupErr, imageId: createdId },
              'Failed to clean up orphan image'
            )
          }
        }
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  /**
   * PATCH /:contentId/image/order
   * Reorders the content gallery. Owner-only.
   */
  fastify.patch(
    '/:contentId/image/order',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { contentId } = ContentParamsSchema.parse(req.params)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }
      const { images } = ReorderImagesPayloadSchema.parse(req.body)
      try {
        const updated = await imageService.reorderUserContentGallery(contentId, images)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        if (err instanceof ImageServiceError && err.code === 'INVALID_REORDER') {
          return sendError(reply, 400, 'INVALID_REORDER')
        }
        return reply.code(500).send({ success: false })
      }
    }
  )
}

export default contentImageRoutes
