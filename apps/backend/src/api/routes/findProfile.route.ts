import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { KindsSchema } from '@shared/zod/map/cluster.dto'

import { sendError, sendForbiddenError } from '../helpers'

import { ClusterService, type ListRef } from '@/services/cluster.service'
import { ProfileService } from '@/services/profile.service'
import { PostService } from '@/services/post.service'
import { EventService } from '@/services/event.service'
import { CommunityService } from '@/services/community.service'
import { GetProfilesResponse } from '@zod/apiResponse.dto'

import { MAP_MAX_ZOOM, MAX_BROWSE_TAGS } from '@shared/maps'
import { mapTagsTranslated } from '../mappers/tag.mappers'
import { mapProfileToPublic } from '../mappers/profile.mappers'
import { mapDbPostToDetail, mapDbPostToOwner } from '../mappers/post.mappers'
import { mapDbEventToDetail, mapDbEventToOwner } from '../mappers/event.mappers'
import { mapDbCommunityToDetail, mapDbCommunityToOwner } from '../mappers/community.mappers'
import { mapperContext } from '../mappers/context'
import {
  BROWSE_LIST_DEFAULT_LIMIT,
  BROWSE_LIST_MAX_LIMIT,
  type BrowseListItem,
  type BrowseListResponse,
} from '@zod/browse/browseList.dto'

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

const ListQuerySchema = BoundsQuerySchema.extend({
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BROWSE_LIST_MAX_LIMIT)
    .default(BROWSE_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
})

const LeavesQuerySchema = z.object({
  clusterId: z.coerce.number().int(),
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  const clusterService = ClusterService.getInstance()
  const profileService = ProfileService.getInstance()
  const postService = PostService.getInstance()
  const eventService = EventService.getInstance()
  const communityService = CommunityService.getInstance()

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
      const tags = mapTagsTranslated(rawTags, req.session.lang)
      return reply.code(200).send({ success: true, features, tags })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch clusters')
    }
  })

  /**
   * GET /list
   * Returns one page of the items inside the viewport, nearest first (from the
   * bbox centre), hydrated for the browse grid. Uses the same cached index as
   * /clusters, so the list and the map show the same items.
   * @query {number} south - Bounding box south latitude
   * @query {number} north - Bounding box north latitude
   * @query {number} west - Bounding box west longitude
   * @query {number} east - Bounding box east longitude
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @query {string} kinds - Comma-separated layer kinds. At least one required.
   * @query {number} [limit=24] - Page size (1–100)
   * @query {number} [offset=0] - Number of items to skip
   * @returns {BrowseListResponse}
   */
  fastify.get('/list', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = ListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid query parameters')
    }

    const { south, north, west, east, tagIds, kinds, limit, offset } = parsed.data
    const viewerId = req.session.profileId
    const ctx = mapperContext(req)

    try {
      const { refs, total } = await clusterService.getOrBuildList(
        viewerId,
        [west, south, east, north],
        tagIds,
        kinds,
        { limit, offset }
      )

      const idsOf = (kind: ListRef['kind']) => refs.filter((r) => r.kind === kind).map((r) => r.id)
      const [profiles, posts, events, communities] = await Promise.all([
        profileService.getProfilesPublicByIds(idsOf('profile'), viewerId),
        postService.findManyByIdsHydrated(idsOf('post'), viewerId),
        eventService.findManyByIdsHydrated(idsOf('event'), viewerId),
        communityService.findManyByIdsHydrated(idsOf('community'), viewerId),
      ])

      const byId = new Map<string, (distanceKm: number) => BrowseListItem>()
      for (const p of profiles) {
        const profile = mapProfileToPublic(p, false, req.session.lang)
        byId.set(p.id, (distanceKm) => ({ kind: 'profile', distanceKm, profile }))
      }
      for (const row of posts) {
        const post =
          row.postedById === viewerId ? mapDbPostToOwner(row, ctx) : mapDbPostToDetail(row, ctx)
        byId.set(row.id, (distanceKm) => ({ kind: 'post', distanceKm, post }))
      }
      for (const row of events) {
        const event =
          row.postedById === viewerId ? mapDbEventToOwner(row, ctx) : mapDbEventToDetail(row, ctx)
        byId.set(row.id, (distanceKm) => ({ kind: 'event', distanceKm, event }))
      }
      for (const row of communities) {
        const community =
          row.postedById === viewerId
            ? mapDbCommunityToOwner(row, ctx)
            : mapDbCommunityToDetail(row, ctx)
        byId.set(row.id, (distanceKm) => ({ kind: 'community', distanceKm, community }))
      }

      // Keep the nearest-first order; drop refs that no longer hydrate
      // (deleted or hidden since the index was built).
      const items = refs.flatMap((r) => {
        const build = byId.get(r.id)
        return build ? [build(r.distanceKm)] : []
      })

      const response: BrowseListResponse = {
        success: true,
        total,
        hasMore: offset + refs.length < total,
        items,
      }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch browse list')
    }
  })

  /**
   * GET /cluster-leaves
   * Returns the individual point features (profiles and/or posts, scoped by
   * the requested `kinds`) that make up a cluster.
   * The `tagIds` param must match the selection used when fetching the
   * cluster itself — each tag combination has its own cached index.
   * Likewise, `kinds` MUST match the value used when fetching the cluster —
   * each `(tags, kinds)` combination is its own cached index.
   * @query {number} clusterId - The cluster ID to expand
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @query {string} kinds - Comma-separated content kinds (e.g., 'profile,post'). At least one required.
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
