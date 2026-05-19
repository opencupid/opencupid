import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'

import { ImageService, ImageServiceError } from '@/services/image.service'
import { prisma } from '@/lib/prisma'
import { sendError } from '../../helpers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import type { ImageApiResponse } from '@zod/image/image.dto'
import { toOwnerImage } from '@/api/mappers/image.mappers'

const ContentParamsSchema = z.object({ contentId: z.string().cuid() })
const AttachImageBodySchema = z.object({ imageId: z.string().cuid() })
const ContentImageParamsSchema = z.object({
  contentId: z.string().cuid(),
  imageId: z.string().cuid(),
})

const contentImageRoutes: FastifyPluginAsync = async (fastify) => {
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
   * POST /:contentId/image/attach
   * Attach an existing image to a UserContent gallery. Owner-only.
   */
  fastify.post(
    '/:contentId/image/attach',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { contentId } = ContentParamsSchema.parse(req.params)
      const { imageId } = AttachImageBodySchema.parse(req.body)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }

      try {
        await imageService.attachToUserContent(imageId, contentId)
        const updated = await imageService.listUserContentGallery(contentId)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error attaching image to content gallery')
        if (err instanceof ImageServiceError) {
          if (err.code === 'NOT_FOUND') return sendError(reply, 404, 'Image not found')
          if (err.code === 'OWNER_MISMATCH') return sendError(reply, 403, 'Forbidden')
          if (err.code === 'ALREADY_ATTACHED') return sendError(reply, 409, 'ALREADY_ATTACHED')
        }
        return sendError(reply, 500, 'Failed to attach image')
      }
    }
  )

  /**
   * DELETE /:contentId/image/:imageId
   * Detach an image from a UserContent gallery. The Image row + files survive.
   */
  fastify.delete(
    '/:contentId/image/:imageId',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { contentId, imageId } = ContentImageParamsSchema.parse(req.params)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }

      try {
        await imageService.detachFromUserContent(imageId, req.session.profileId)
        const updated = await imageService.listUserContentGallery(contentId)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error detaching image from content gallery')
        if (err instanceof ImageServiceError) {
          if (err.code === 'NOT_FOUND') return sendError(reply, 404, 'Image not found')
          if (err.code === 'OWNER_MISMATCH') return sendError(reply, 403, 'Forbidden')
        }
        return sendError(reply, 500, 'Failed to detach image')
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
