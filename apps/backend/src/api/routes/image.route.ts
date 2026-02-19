import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ProfileService } from 'src/services/profile.service'
import { ImageService } from 'src/services/image.service'
import { uploadTmpDir } from '@/lib/media'
import { sendError, sendForbiddenError } from '../helpers'
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

  // instantiate services
  const profileService = ProfileService.getInstance()
  const imageService = ImageService.getInstance()

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const rawImages = await imageService.listImages(req.user.userId)
      const images = mapProfileImagesToOwner(rawImages)
      const response: ImageApiResponse = { success: true, images }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch user images')
    }
  })
  /**
   * Upload an image to the user's profile
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
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

      const profile = await profileService.getProfileByUserId(req.user.userId)
      if (!profile) {
        return sendError(reply, 404, 'No user profile to link the image to')
      }

      try {
        const stored = await imageService.storeImage(
          req.user.userId,
          fileUpload.filepath,
          captionText
        )
        if (!stored) {
          return sendError(reply, 500, 'Failed to store image')
        }
        const updated = await profileService.addProfileImage(profile.id, stored.id)
        const images = mapProfileImagesToOwner(updated.profileImages)
        const response: ImageApiResponse = { success: true, images }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error('Error storing image:', err)
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  /**
   * Delete a profile image
   */
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: profileImageId } = IdLookupParamsSchema.parse(req.params)

    try {
      const ok = await imageService.deleteImage(req.user.userId, profileImageId)
      if (!ok) {
        return sendError(reply, 500, 'Failed to delete image')
      }
      const updated = await imageService.listImages(req.user.userId)
      if (!updated) {
        return sendError(reply, 400, 'No user profile found to update after image deletion')
      }
      const images = mapProfileImagesToOwner(updated)
      const response: ImageApiResponse = { success: true, images }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to delete image')
    }
  })

  /**
   * Reorder profile images
   */
  fastify.patch('/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { images } = ReorderProfileImagesPayloadSchema.parse(req.body)

    try {
      const updated = await imageService.reorderImages(req.user.userId, images)
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
