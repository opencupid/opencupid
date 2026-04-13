import { FastifyPluginAsync } from 'fastify'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'

// ────────────────────────────────────────────────────────────────────
// DEPRECATED SHIM — /browse/bounds retired
// ────────────────────────────────────────────────────────────────────
// Browse map data is now served by the unified cluster endpoint at
// GET /find/social/map/clusters (which returns features + tags).
// This endpoint is kept solely so stale frontends do not break.
//
// TODO(cleanup): remove this route and the BrowseBoundsResponse type
// once all clients have been updated and dashboards confirm no traffic.
// ────────────────────────────────────────────────────────────────────

const browseRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * @deprecated GET /bounds — replaced by GET /find/social/map/clusters.
   * Returns a static empty response. Kept for stale client compatibility only.
   */
  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const response: BrowseBoundsResponse = { success: true, profiles: [], posts: [], tags: [] }
    return reply.code(200).send(response)
  })
}

export default browseRoutes
