import { validateBody } from '@/utils/zodValidate'
import {
  SearchQuerySchema,
  CreateTagPayloadSchema,
  CreateTagPayload,
  PopularTagsQuerySchema,
} from '@zod/tag/tag.dto'
import { FastifyPluginAsync } from 'fastify'
import { sendError, addDebounceHeaders, rateLimitConfig } from '../helpers'
import { TagService } from '@/services/tag.service'
import type { TagResponse, TagsResponse, PopularTagsResponse } from '@zod/apiResponse.dto'
import { DbTagToPublicTagTransform } from '../mappers/tag.mappers'
const tagsRoutes: FastifyPluginAsync = async (fastify) => {
  const tagService = TagService.getInstance()

  /**
   * GET /popular
   * Returns popular tags ordered by usage count. Falls back to global results if no tags
   * match the country filter.
   * @query {number} [limit] - Max tags to return
   * @query {string} [country] - Country code to filter by
   * @returns {PopularTagsResponse}
   */
  fastify.get('/popular', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { limit, country } = PopularTagsQuerySchema.parse(req.query)
    const locale = req.session.lang

    try {
      let tags = await tagService.getPopularTags({ limit, country, locale })
      // if no tags found with country filter, broaden the query without country
      if (tags.length === 0) {
        tags = await tagService.getPopularTags({ limit, country: undefined, locale })
      }
      const response: PopularTagsResponse = { success: true, tags }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch popular tags')
    }
  })

  /**
   * GET /search
   * Searches tags by partial name for type-ahead. Returns debounce headers for frontend throttling.
   * @query {string} q - Search query
   * @returns {TagsResponse}
   */
  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { q } = SearchQuerySchema.parse(req.query)
    const locale = req.session.lang

    try {
      const tags = await tagService.search(q, locale)
      addDebounceHeaders(reply)

      if (!tags || tags.length === 0) {
        const response: TagsResponse = { success: true, tags: [] }
        return reply.code(200).send(response)
      }
      const publicTags = tags.map((tag) => DbTagToPublicTagTransform(tag, locale))
      const response: TagsResponse = { success: true, tags: publicTags }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to search tags')
    }
  })

  /**
   * POST /
   * Creates a user-generated tag in the session locale.
   * @body {string} name - Tag display name
   * @returns {TagResponse}
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: {
        ...rateLimitConfig(fastify, '5 minute', 10),
      },
    },
    async (req, reply) => {
      const userId = req.user.userId
      const locale = req.session.lang

      if (!userId) {
        return sendError(reply, 401, 'Unauthorized')
      }
      // validateBody has some typing issues
      const data: CreateTagPayload | null = await validateBody(CreateTagPayloadSchema, req, reply)
      if (!data) return
      try {
        const created = await tagService.create(locale, {
          name: data.name,
          createdBy: userId, // Set the creator to the authenticated user
          isUserCreated: true, // Mark as user-created
          originalLocale: locale,
        })
        const tag = DbTagToPublicTagTransform(created, locale)
        const response: TagResponse = { success: true, tag }
        return reply.code(200).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        if (err.code === 'P2025') {
          return sendError(reply, 404, 'Tag not found')
        }
        return sendError(reply, 500, 'Failed to create tag')
      }
    }
  )
}

export default tagsRoutes
