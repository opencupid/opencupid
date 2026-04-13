import { FastifyPluginAsync } from 'fastify'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
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
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { mapDbPostToOwner, mapDbPostToPublic, mapDbPostToDetail } from '../mappers/post.mappers'

const postRoutes: FastifyPluginAsync = async (fastify) => {
  const postService = PostService.getInstance()

  /**
   * POST /
   * Creates a new post for the authenticated profile.
   * @body {CreatePostPayload}
   * @returns {CreatePostResponse} 201
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
        const created = await postService.create(profileId, data)
        const post = mapDbPostToOwner(created)
        // TODO filter non-public fields
        const response: CreatePostResponse = { success: true, post }
        return reply.code(201).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to create post')
      }
    }
  )

  /**
   * GET /:id
   * Returns a single post by ID. Returns owner view (with visibility metadata)
   * when the viewer is the post author, public view otherwise.
   * @param {string} id - Post ID (CUID)
   * @returns {{ success, post: OwnerPost | PublicPostDetail }}
   */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = PostParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId

    try {
      const raw = await postService.findByIdWithContext(id, viewerProfileId)
      if (!raw) {
        return sendError(reply, 404, 'Post not found')
      }

      const post =
        raw.postedById === viewerProfileId ? mapDbPostToOwner(raw) : mapDbPostToDetail(raw)

      return reply.code(200).send({ success: true, post })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch post')
    }
  })

  /**
   * PATCH /:id
   * Updates a post. Only the post owner can update.
   * @param {string} id - Post ID (CUID)
   * @body {UpdatePostPayload}
   * @returns {UpdatePostResponse}
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
        const raw = await postService.update(id, profileId, data)
        if (!raw) {
          return sendError(reply, 404, 'Post not found or access denied')
        }

        const post = mapDbPostToOwner(raw)
        const response: UpdatePostResponse = { success: true, post }
        return reply.code(200).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update post')
      }
    }
  )

  /**
   * DELETE /:id
   * Deletes a post. Only the post owner can delete.
   * @param {string} id - Post ID (CUID)
   * @returns {DeletePostResponse}
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
   * GET /
   * Returns all posts, optionally filtered by type, with pagination.
   * @query {string} [type] - Post type filter
   * @query {number} [limit] - Page size
   * @query {number} [offset] - Offset
   * @returns {PostsResponse}
   */
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = PostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findAll({
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      const posts = raw.map((post) => mapDbPostToPublic(post, req.session.profileId))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch posts')
    }
  })

  /**
   * GET /nearby
   * Returns posts within a radius of a given coordinate.
   * @query {number} lat - Center latitude
   * @query {number} lon - Center longitude
   * @query {number} radius - Radius in km
   * @query {string} [type] - Post type filter
   * @query {number} [limit] - Page size
   * @query {number} [offset] - Offset
   * @returns {PostsResponse}
   */
  fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = NearbyPostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findNearby(query.lat, query.lon, query.radius, {
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      const posts = raw.map((post) => mapDbPostToPublic(post, req.session.profileId))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch nearby posts')
    }
  })

  /**
   * GET /bounds
   * Returns posts within a geographic bounding box.
   * @query {number} south - South latitude
   * @query {number} north - North latitude
   * @query {number} west - West longitude
   * @query {number} east - East longitude
   * @returns {PostsResponse}
   */
  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'Missing or invalid bounds parameters (south, north, west, east)'
      )
    }

    try {
      const raw = await postService.findInBounds(parsed.data)
      const posts = raw.map((post) => mapDbPostToPublic(post, req.session.profileId))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch posts in bounds')
    }
  })

  /**
   * GET /recent
   * Returns posts created in the last 7 days.
   * @query {string} [type] - Post type filter
   * @query {number} [limit] - Page size
   * @query {number} [offset] - Offset
   * @returns {PostsResponse}
   */
  fastify.get('/recent', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = PostQuerySchema.parse(req.query)

    try {
      const raw = await postService.findRecent({
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      })
      const posts = raw.map((post) => mapDbPostToPublic(post, req.session.profileId))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch recent posts')
    }
  })

  /**
   * GET /profile/:profileId
   * Returns posts by a specific profile. Includes invisible posts only when viewing own profile.
   * @param {string} profileId - Profile ID (CUID)
   * @query {string} [type] - Post type filter
   * @query {number} [limit] - Page size
   * @query {number} [offset] - Offset
   * @returns {PostsResponse}
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
      const posts = raw.map((post) => mapDbPostToPublic(post, viewerProfileId))

      const response: PostsResponse = { success: true, posts }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile posts')
    }
  })

  /**
   * GET /profile/me
   * Returns the current user's posts (owner view — always includes invisible posts).
   * @query {string} [type] - Post type filter
   * @query {number} [limit] - Page size
   * @query {number} [offset] - Offset
   * @returns {{ success, posts }}
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
      const posts = raw.map((post) => mapDbPostToOwner(post))

      return reply.code(200).send({ success: true, posts })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile posts')
    }
  })
}

export default postRoutes
