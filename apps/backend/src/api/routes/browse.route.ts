import { FastifyPluginAsync } from 'fastify'
import { sendError } from '../helpers'
import { BrowseService } from '@/services/browse.service'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'

const browseRoutes: FastifyPluginAsync = async (fastify) => {
  const browseService = BrowseService.getInstance(fastify.prisma)

  /**
   * GET /bounds
   * Returns profiles, posts, and available tags within a geographic bounding box.
   * Tags are derived from profile results only.
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

    const viewerProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const result = await browseService.findInBounds(viewerProfileId, parsed.data, locale)
      const response: BrowseBoundsResponse = { success: true, ...result }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch browse data')
    }
  })
}

export default browseRoutes
