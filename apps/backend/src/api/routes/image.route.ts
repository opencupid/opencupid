import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService, ImageServiceError } from '@/services/image.service'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError } from '../helpers'
import { mapProfileImagesToOwner } from '@/api/mappers/profile.mappers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse } from '@zod/image/image.dto'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})
const UpdateImageBodySchema = z.object({ altText: z.string().optional() })

const imageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: appConfig.IMAGE_MAX_SIZE, // Max file size in bytes
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
      parts: 1000, // For multipart forms, the max number of parts (fields + files)
    },
    attachFieldsToBody: false,
  })

  const imageService = ImageService.getInstance()

  /**
   * GET /me
   * Returns the caller's profile gallery (owner view with private metadata).
   */
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const images = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(images),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch user images')
    }
  })

  /**
   * POST /
   * Uploads an image and attaches it to the caller's profile gallery.
   * createImage and attachToProfile each open their own transaction; on attach
   * failure we compensate by deleting the freshly-created Image. Window for
   * an orphan is the latency between createImage and attachToProfile.
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      let files

      try {
        files = await req.saveRequestFiles({
          tmpdir: uploadTmpDir(),
          limits: {
            fileSize: appConfig.IMAGE_MAX_SIZE,
            files: 1,
            fields: 1,
          },
        })
      } catch (err: any) {
        fastify.log.warn('Upload error:', err, err.code)

        const reason =
          err.code === 'FST_REQ_FILE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'IMAGE_UPLOAD_FAILED'

        return sendError(reply, 400, reason)
      }

      if (files.length === 0) return sendError(reply, 400, 'No file uploaded')

      const fileUpload = files[0]
      // Validate file type
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
          captionText,
          { detectFace: true }
        )
        createdId = created.id
        await imageService.attachToProfile(created.id, req.session.profileId)

        const updated = await imageService.listProfileGallery(req.session.profileId)
        const response: ImageApiResponse = {
          success: true,
          images: mapProfileImagesToOwner(updated),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing image')
        if (createdId) {
          // Compensate: delete the orphan Image (no join exists, so deleteImage
          // just removes the row + files).
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
   * DELETE /:id
   * Deletes an image. Service detects which gallery it lived in and cleans up.
   */
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: imageId } = IdLookupParamsSchema.parse(req.params)
    try {
      await imageService.deleteImage(imageId, req.session.profileId)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      if (err instanceof ImageServiceError && err.code === 'OWNER_MISMATCH') {
        return sendError(reply, 403, 'Forbidden')
      }
      return sendError(reply, 500, 'Failed to delete image')
    }
  })

  /**
   * PATCH /:id
   * Updates an image's altText. Owner-only.
   */
  fastify.patch('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: imageId } = IdLookupParamsSchema.parse(req.params)
    const patch = UpdateImageBodySchema.parse(req.body)
    try {
      await imageService.updateImage(imageId, req.session.profileId, patch)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      if (err instanceof ImageServiceError && err.code === 'OWNER_MISMATCH') {
        return sendError(reply, 403, 'Forbidden')
      }
      return sendError(reply, 500, 'Failed to update image')
    }
  })

  /**
   * PATCH /order
   * Reorders the caller's profile gallery.
   */
  fastify.patch('/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { images } = ReorderImagesPayloadSchema.parse(req.body)
    try {
      const updated = await imageService.reorderProfileGallery(req.session.profileId, images)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      if (err instanceof ImageServiceError && err.code === 'INVALID_REORDER') {
        return sendError(reply, 400, 'INVALID_REORDER')
      }
      return reply.code(500).send({ success: false })
    }
  })
}

export default imageRoutes
