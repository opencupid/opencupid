import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService } from '@/services/image.service'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError } from '../helpers'
import { mapProfileImagesToOwner } from '@/api/mappers/profile.mappers'
import { ReorderProfileImagesPayloadSchema } from '@zod/profile/profileimage.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse } from '@zod/profile/profileimage.dto'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})

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
   * Returns all profile images for the authenticated user (owner view with private metadata).
   * @returns {ImageApiResponse}
   */
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const rawImages = await imageService.listImages(req.session.profileId)
      const images = mapProfileImagesToOwner(rawImages)
      const response: ImageApiResponse = { success: true, images }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch user images')
    }
  })
  /**
   * POST /
   * Uploads a profile image (multipart). Validates file type and size.
   * @body {File} file - Image file (multipart)
   * @body {string} [captionText] - Optional image caption (form field)
   * @returns {ImageApiResponse} Updated list of all profile images
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

      try {
        const stored = await imageService.storeImage(
          req.session.profileId,
          fileUpload.filepath,
          captionText
        )
        if (!stored) {
          return sendError(reply, 500, 'Failed to store image')
        }
        const updated = await imageService.listImages(req.session.profileId)
        const images = mapProfileImagesToOwner(updated)
        const response: ImageApiResponse = { success: true, images }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing image')
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  /**
   * DELETE /:id
   * Deletes a profile image by its profile-image ID.
   * @param {string} id - ProfileImage ID (CUID)
   * @returns {ImageApiResponse} Updated list of remaining profile images
   */
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: profileImageId } = IdLookupParamsSchema.parse(req.params)

    try {
      const ok = await imageService.deleteImage(req.session.profileId, profileImageId)
      if (!ok) {
        return sendError(reply, 500, 'Failed to delete image')
      }
      const updated = await imageService.listImages(req.session.profileId)
      const images = mapProfileImagesToOwner(updated)
      const response: ImageApiResponse = { success: true, images }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to delete image')
    }
  })

  /**
   * PATCH /order
   * Reorders profile images by setting new position values.
   * @body {ReorderProfileImagesPayload} { images: [{ id, position }] }
   * @returns {ImageApiResponse} Updated list of profile images in new order
   */
  fastify.patch('/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { images } = ReorderProfileImagesPayloadSchema.parse(req.body)

    try {
      const updated = await imageService.reorderImages(req.session.profileId, images)
      const ownerImages = mapProfileImagesToOwner(updated)
      const response: ImageApiResponse = { success: true, images: ownerImages }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ success: false })
    }
  })
}

export default imageRoutes
