import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { KindsSchema } from '@shared/zod/map/cluster.dto'

import { sendError, sendForbiddenError } from '../helpers'

import { ClusterService } from '@/services/cluster.service'
import { GetProfilesResponse } from '@zod/apiResponse.dto'

import { MAP_MAX_ZOOM, MAX_BROWSE_TAGS } from '@shared/maps'
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

const ClusterQuerySchema = BoundsQuerySchema.extend({
  zoom: z.coerce.number().int().min(0).max(MAP_MAX_ZOOM),
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})

const LeavesQuerySchema = z.object({
  clusterId: z.coerce.number().int(),
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  const clusterService = ClusterService.getInstance()

  /**
   * GET /clusters
   * Returns map clusters for the visible viewport at a given zoom level,
   * optionally filtered by tag IDs.
   * @query {number} south - Bounding box south latitude
   * @query {number} north - Bounding box north latitude
   * @query {number} west - Bounding box west longitude
   * @query {number} east - Bounding box east longitude
   * @query {number} zoom - Map zoom level (0–12)
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @query {string} kinds - Comma-separated layer kinds (e.g., 'profile,post'). At least one required.
   * @returns {{ success: true, features: MapFeature[], tags: PublicTag[] }}
   */
  fastify.get('/clusters', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = ClusterQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid query parameters')
    }

    const { south, north, west, east, zoom, tagIds, kinds } = parsed.data
    const bbox: [number, number, number, number] = [west, south, east, north]

    try {
      const { features, tags: rawTags } = await clusterService.getOrBuildClusters(
        req.session.profileId,
        bbox,
        zoom,
        tagIds,
        kinds
      )
      const tags = mapProfileTagsTranslated(rawTags, req.session.lang)
      return reply.code(200).send({ success: true, features, tags })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch clusters')
    }
  })

  /**
   * GET /cluster-leaves
   * Returns the individual profile points that make up a cluster.
   * The `tagIds` param must match the selection used when fetching the
   * cluster itself — each tag combination has its own cached index.
   * Likewise, `kinds` MUST match the value used when fetching the cluster —
   * each `(tags, kinds)` combination is its own cached index.
   * @query {number} clusterId - The cluster ID to expand
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @query {string} kinds - Comma-separated layer kinds (e.g., 'profile,post'). At least one required.
   * @returns {{ success: true, features: PointFeature[] }}
   */
  fastify.get('/cluster-leaves', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = LeavesQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid query parameters')
    }

    const { clusterId, tagIds, kinds } = parsed.data
    const features = clusterService.getLeaves(req.session.profileId, clusterId, tagIds, kinds)
    return reply.code(200).send({ success: true, features })
  })

  // ── Deprecated shims for stale 0.48.0 clients ──────────────────────
  // Remove once all clients have updated.

  /** @deprecated Renamed to /clusters */
  fastify.get(
    '/social/map/clusters',
    { onRequest: [fastify.authenticate] },
    async (_req, reply) => {
      return reply.code(200).send({ success: true, features: [], tags: [] })
    }
  )

  /** @deprecated Renamed to /cluster-leaves */
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
