import { FastifyPluginAsync } from 'fastify'
import { validateBody } from '@/utils/zodValidate'
import {
  CreatePostPayloadSchema,
  UpdatePostPayloadSchema,
  PostParamsSchema,
  PostQuerySchema,
  NearbyPostQuerySchema,
  type CreatePostPayload,
  type UpdatePostPayload,
} from '@zod/post/post.dto'
import { rateLimitConfig, sendError } from '../helpers'
import { PostService } from '@/services/post.service'
import type {
  PostsResponse,
  PostResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { mapProfileSummary } from '../mappers/profile.mappers'
import { mapPostWithProfile } from '../mappers/post.mappers'

const postRoutes: FastifyPluginAsync = async fastify => {
  const postService = PostService.getInstance(fastify.prisma)

  /**
   * Create a new post
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) {
        return sendError(reply, 401, 'Profile required')
      }

      const data: CreatePostPayload | null = validateBody(CreatePostPayloadSchema, req, reply)
      if (!data) return

      try {
        const post = await postService.create(profileId, data)
        const response: CreatePostResponse = { success: true, post }
        return reply.code(201).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to create post')
      }
    }
  )

  /**
   * Get a specific post by ID
   */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = PostParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId

    try {
      const post = await postService.findById(id, viewerProfileId)
      if (!post) {
        return sendError(reply, 404, 'Post not found')
      }

      const response: PostResponse = { success: true, post }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch post')
    }
  })

  /**
   * Update a post
   */
  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId

      if (!profileId) {
        return sendError(reply, 401, 'Profile required')
      }

      const data: UpdatePostPayload | null = validateBody(UpdatePostPayloadSchema, req, reply)
      if (!data) return

      try {
        const post = await postService.update(id, profileId, data)
        if (!post) {
          return sendError(reply, 404, 'Post not found or access denied')
        }

        const response: UpdatePostResponse = { success: true, post }
        return reply.code(200).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update post')
      }
    }
  )

  /**
   * Delete a post
   */
  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = PostParamsSchema.parse(req.params)
      const profileId = req.session.profileId

      if (!profileId) {
        return sendError(reply, 401, 'Profile required')
      }

      try {
        const result = await postService.delete(id, profileId)
        if (!result) {
          return sendError(reply, 404, 'Post not found or access denied')
        }

        const response: DeletePostResponse = { success: true }
        return reply.code(200).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to delete post')
      }
    }
  )

  /**
   * List all posts
   */
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = PostQuerySchema.parse(req.query)

    try {
      const raw = (await postService.findAll({
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      )
      const posts = raw.map(post => mapPostWithProfile(post))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch posts')
    }
  })

  /**
   * Get nearby posts by lat/lon/radius
   */
  fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = NearbyPostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findNearby(query.lat, query.lon, query.radius, {
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      const posts = raw.map(post => mapPostWithProfile(post))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch nearby posts')
    }
  })

  /**
   * Get recent posts (last week)
   */
  fastify.get('/recent', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = PostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findRecent({
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      const posts = raw.map(post => mapPostWithProfile(post))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch recent posts')
    }
  })

  /**
   * Get posts by profile ID (for viewing user's own posts)
   */
  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: profileId } = PostParamsSchema.parse({ id: (req.params as any).profileId })
    const viewerProfileId = req.session.profileId
    const query = PostQuerySchema.parse(req.query)

    try {
      // If viewing own posts, include invisible ones
      const includeInvisible = viewerProfileId === profileId

      const raw = await postService.findByProfileId(profileId, {
        type: query.type,
        limit: query.limit,
        offset: query.offset,
        includeInvisible,
      })
      const posts = raw.map(post => mapPostWithProfile(post))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile posts')
    }
  })

  /**
   * Get current user's posts
   */
  fastify.get('/profile/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) {
      return sendError(reply, 401, 'Profile required')
    }

    const query = PostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findByProfileId(profileId, {
        type: query.type,
        limit: query.limit,
        offset: query.offset,
        includeInvisible: true, // Always include invisible posts for own profile
      })
      const posts = raw.map(post => mapPostWithProfile(post))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile posts')
    }
  })
}

export default postRoutes