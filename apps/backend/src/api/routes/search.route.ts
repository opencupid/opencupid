import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { sendError } from '../helpers'
import { SearchService } from '@/services/search.service'
import { mapProfileSummary } from '../mappers/profile.mappers'
import { mapPostSummary } from '../mappers/post.mappers'
import { DbTagToPublicTagTransform } from '../mappers/tag.mappers'
import type { SearchResponse } from '@zod/search/search.dto'

const SearchQuerySchema = z.object({
  q: z.string().default(''),
})

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const searchService = SearchService.getInstance()

  /**
   * GET /search?q=<query>
   * Returns results grouped by content kind: tags, profiles, posts, locations.
   * All four queries run in parallel. Below the minimum query length the
   * endpoint short-circuits with empty arrays.
   */
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = SearchQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid query parameters')
    }
    const { q } = parsed.data
    const { lang, profileId } = req.session

    try {
      const { tags, profiles, posts, locations } = await searchService.search(q, lang, profileId)

      const response: SearchResponse = {
        success: true,
        tags: tags.map((t) => DbTagToPublicTagTransform(t, lang)),
        profiles: profiles.map(mapProfileSummary),
        posts: posts.map(mapPostSummary),
        locations,
      }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Search failed')
    }
  })
}

export default searchRoutes
