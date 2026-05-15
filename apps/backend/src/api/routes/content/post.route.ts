import type { FastifyPluginAsync } from 'fastify'
import { PostService } from '@/services/post.service'
import {
  CreatePostPayloadSchema,
  UpdatePostPayloadSchema,
  PostParamsSchema,
  NearbyPostQuerySchema,
  type CreatePostPayload,
  type UpdatePostPayload,
} from '@zod/post/post.dto'
import { PaginationSchema } from '@zod/userContent/userContent.dto'
import { z } from 'zod'
import { mapDbPostToOwner, mapDbPostToDetail, mapDbPostToPublic } from '../../mappers/post.mappers'
import { rateLimitConfig, sendError } from '../../helpers'
import { validateBody } from '@/utils/zodValidate'

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

const postRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = PostService.getInstance()

  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<CreatePostPayload>(CreatePostPayloadSchema, req, reply)
      if (!data) return
      try {
        const created = await svc.create(profileId, data)
        return reply.code(201).send({ success: true, post: mapDbPostToOwner(created) })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to create post')
      }
    }
  )

  fastify.get('/feed', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const viewerProfileId = req.session.profileId
    try {
      const page = PaginationSchema.parse(req.query)
      const rows = await svc.findFeedHydrated({ ...page, includeInvisible: false })
      const posts = rows.map((r) => mapDbPostToPublic(r, viewerProfileId))
      return reply.code(200).send({ success: true, posts })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch posts')
    }
  })

  fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const viewerProfileId = req.session.profileId
    try {
      const q = NearbyPostQuerySchema.parse(req.query)
      const rows = await svc.findNearbyHydrated(q.lat, q.lon, q.radius, {
        ...q,
        includeInvisible: false,
      })
      const posts = rows.map((r) => mapDbPostToPublic(r, viewerProfileId))
      return reply.code(200).send({ success: true, posts })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch nearby posts')
    }
  })

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = PostParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    try {
      const row = await svc.findByIdHydrated(id, viewerProfileId)
      if (!row) return sendError(reply, 404, 'Post not found')
      const isOwner = row.postedById === viewerProfileId
      const post = isOwner ? mapDbPostToOwner(row) : mapDbPostToDetail(row, viewerProfileId)
      return reply.code(200).send({ success: true, post })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch post')
    }
  })

  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<UpdatePostPayload>(UpdatePostPayloadSchema, req, reply)
      if (!data) return
      try {
        const row = await svc.update(id, profileId, data)
        if (!row) return sendError(reply, 404, 'Post not found or access denied')
        return reply.code(200).send({ success: true, post: mapDbPostToOwner(row) })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update post')
      }
    }
  )

  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      try {
        const result = await svc.softDelete(id, profileId)
        if (!result) return sendError(reply, 404, 'Post not found or access denied')
        return reply.code(200).send({ success: true })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to delete post')
      }
    }
  )

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile required')
    try {
      const page = PaginationSchema.parse(req.query)
      const rows = await svc.findByProfileIdHydrated(profileId, profileId, {
        ...page,
        includeInvisible: true,
      })
      return reply.code(200).send({ success: true, posts: rows.map(mapDbPostToOwner) })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch own posts')
    }
  })

  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { profileId } = ProfileParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    try {
      const page = PaginationSchema.parse(req.query)
      const rows = await svc.findByProfileIdHydrated(profileId, viewerProfileId, {
        ...page,
        includeInvisible: viewerProfileId === profileId,
      })
      const posts = rows.map((r) =>
        viewerProfileId === profileId ? mapDbPostToOwner(r) : mapDbPostToDetail(r, viewerProfileId)
      )
      return reply.code(200).send({ success: true, posts })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile posts')
    }
  })
}

export default postRoutes
