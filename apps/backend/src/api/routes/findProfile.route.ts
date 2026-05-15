import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { KindsSchema } from '@shared/zod/map/map.dto'

import { sendError, sendForbiddenError } from '../helpers'

import { PoiBoundsService } from '@/services/poiBounds.service'
import { GetProfilesResponse } from '@zod/apiResponse.dto'

import { MAX_BROWSE_TAGS } from '@shared/maps'
import { mapProfileTagsTranslated } from '../mappers/tag.mappers'

/** Zod schema: optional comma-separated tag IDs → deduped string[]. */
const TagIdsSchema = z
  .string()
  .default('')
  .transform((raw) => [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ])
  .pipe(z.array(z.string().cuid()).max(MAX_BROWSE_TAGS))

const BoundsRequestSchema = BoundsQuerySchema.extend({
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  const poiBoundsService = PoiBoundsService.getInstance()

  /**
   * GET /bounds
   * Returns every POI (profiles, posts, events, communities matching `kinds`)
   * inside the visible viewport, plus the set of tags carried by matching
   * profiles. Replaces the previous `/clusters` endpoint: no zoom param, no
   * server-side clustering — the frontend applies density-based spreading
   * at render time.
   * @query {number} south - Bounding box south latitude
   * @query {number} north - Bounding box north latitude
   * @query {number} west - Bounding box west longitude
   * @query {number} east - Bounding box east longitude
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @query {string} kinds - Comma-separated layer kinds (e.g., 'profile,post'). At least one required.
   * @returns {{ success: true, features: PointFeature[], tags: PublicTag[] }}
   */
  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = BoundsRequestSchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid query parameters')
    }

    const { south, north, west, east, tagIds, kinds } = parsed.data
    const bbox: [number, number, number, number] = [west, south, east, north]

    try {
      const { features, tags: rawTags } = await poiBoundsService.getPois(
        req.session.profileId,
        bbox,
        tagIds,
        kinds
      )
      const tags = mapProfileTagsTranslated(rawTags, req.session.lang)
      return reply.code(200).send({ success: true, features, tags })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch POIs')
    }
  })

  // ── Deprecated shims for stale clients ─────────────────────────────
  // Remove once all clients have updated.

  /** @deprecated Replaced by /bounds — supercluster removed in favour of
   * frontend-side density spreading. */
  fastify.get('/clusters', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    return reply.code(200).send({ success: true, features: [], tags: [] })
  })

  /** @deprecated Cluster expansion is no longer needed — the frontend
   * spreads colocated markers in pixel space. */
  fastify.get('/cluster-leaves', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    return reply.code(200).send({ success: true, features: [] })
  })

  /** @deprecated Renamed to /bounds (originally /clusters) */
  fastify.get(
    '/social/map/clusters',
    { onRequest: [fastify.authenticate] },
    async (_req, reply) => {
      return reply.code(200).send({ success: true, features: [], tags: [] })
    }
  )

  /** @deprecated Cluster expansion is no longer needed. */
  fastify.get(
    '/social/map/clusters/leaves',
    { onRequest: [fastify.authenticate] },
    async (_req, reply) => {
      return reply.code(200).send({ success: true, features: [] })
    }
  )

  /** @deprecated Endpoint retired */
  fastify.get('/dating/match-ids', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    return reply.code(200).send({ success: true, ids: [] })
  })

  /** @deprecated Endpoint retired */
  fastify.get('/social/new', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const response: GetProfilesResponse = { success: true, profiles: [] }
    return reply.code(200).send(response)
  })
}

export default findProfileRoutes
