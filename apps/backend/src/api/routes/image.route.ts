import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService, ImageServiceError } from '@/services/image.service'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError } from '../helpers'
import { mapProfileImagesToOwner } from '@/api/mappers/profile.mappers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse, ImageResponse } from '@zod/image/image.dto'
import { toOwnerImage } from '@/api/mappers/image.mappers'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})
const UpdateImageBodySchema = z.object({ altText: z.string().optional() })
const AttachImageBodySchema = z.object({ imageId: z.string().cuid() })
const ImageIdParamsSchema = z.object({ imageId: z.string().cuid() })

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
   * Uploads an image owned by the caller. Does NOT attach it to any gallery —
   * the caller follows up with POST /me/attach (profile) or
   * POST /content/:contentId/image/attach (content). If the follow-up fails,
   * the caller is responsible for issuing DELETE /image/:id to clean up.
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
      if (!fileUpload.mimetype.startsWith('image/')) {
        return sendError(reply, 400, 'Uploaded file must be an image')
      }

      const captionText = ((
        (Array.isArray(fileUpload.fields.captionText)
          ? fileUpload.fields.captionText[0]
          : fileUpload.fields.captionText) as MultipartValue
      ).value ?? '') as string

      try {
        const created = await imageService.createImage(
          req.session.profileId,
          fileUpload.filepath,
          captionText
        )
        const response: ImageResponse = {
          success: true,
          image: toOwnerImage(created),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing image')
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  /**
   * POST /me/attach
   * Attach an existing image (already owned by the caller) to the profile gallery.
   */
  fastify.post('/me/attach', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { imageId } = AttachImageBodySchema.parse(req.body)
    try {
      await imageService.attachToProfile(imageId, req.session.profileId)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error({ err }, 'Error attaching image to profile gallery')
      if (err instanceof ImageServiceError) {
        if (err.code === 'NOT_FOUND') return sendError(reply, 404, 'Image not found')
        if (err.code === 'OWNER_MISMATCH') return sendError(reply, 403, 'Forbidden')
        if (err.code === 'ALREADY_ATTACHED') return sendError(reply, 409, 'ALREADY_ATTACHED')
      }
      return sendError(reply, 500, 'Failed to attach image')
    }
  })

  /**
   * DELETE /me/:imageId
   * Detach an image from the profile gallery. The Image row + files survive —
   * use DELETE /:id to remove the image entirely.
   */
  fastify.delete('/me/:imageId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { imageId } = ImageIdParamsSchema.parse(req.params)
    try {
      await imageService.detachFromProfile(imageId, req.session.profileId)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error({ err }, 'Error detaching image from profile gallery')
      if (err instanceof ImageServiceError) {
        if (err.code === 'NOT_FOUND') return sendError(reply, 404, 'Image not found')
        if (err.code === 'OWNER_MISMATCH') return sendError(reply, 403, 'Forbidden')
        if (err.code === 'PROFILE_GALLERY_MIN') return sendError(reply, 409, 'PROFILE_GALLERY_MIN')
      }
      return sendError(reply, 500, 'Failed to detach image')
    }
  })

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
      if (err instanceof ImageServiceError) {
        if (err.code === 'NOT_FOUND') return sendError(reply, 404, 'Image not found')
        if (err.code === 'OWNER_MISMATCH') return sendError(reply, 403, 'Forbidden')
        if (err.code === 'PROFILE_GALLERY_MIN') return sendError(reply, 409, 'PROFILE_GALLERY_MIN')
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
