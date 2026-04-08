import { FastifyPluginAsync, type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'

import { sendError, sendForbiddenError } from '../helpers'

import { ProfileMatchService, type OrderBy } from '@/services/profileMatch.service'
import { ClusterService } from '@/services/cluster.service'
import {
  GetProfilesResponse,
  type GetMatchIdsResponse,
  type GetSocialMatchFilterResponse,
} from '@zod/apiResponse.dto'
import type { SocialMatchFilterDTO } from '@shared/zod/match/filters.dto'
import { MAP_MAX_ZOOM } from '@shared/maps'
import { mapProfileToPublic } from '../mappers/profile.mappers'

// Pagination query schema for infinite scrolling
const PaginationQuerySchema = z.object({
  skip: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).default(0)
  ),
  take: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(50).default(10)
  ),
})

/**
 * Parse a comma-separated `tagIds` query param into a deduped string array.
 * Returns `[]` for undefined / empty / whitespace-only values.
 */
function parseTagIds(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.trim().length === 0) return []
  const ids = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return Array.from(new Set(ids))
}

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  // instantiate services
  const profileMatchService = ProfileMatchService.getInstance()
  const clusterService = ClusterService.getInstance()

  const BoundsQuerySchema = z.object({
    south: z.coerce.number(),
    north: z.coerce.number(),
    west: z.coerce.number(),
    east: z.coerce.number(),
    tagIds: z.string().optional(),
  })

  const ClusterQuerySchema = z.object({
    south: z.coerce.number(),
    north: z.coerce.number(),
    west: z.coerce.number(),
    east: z.coerce.number(),
    zoom: z.coerce.number().int().min(0).max(MAP_MAX_ZOOM),
    tagIds: z.string().optional(),
  })

  const LeavesQuerySchema = z.object({
    clusterId: z.coerce.number().int(),
    tagIds: z.string().optional(),
  })

  /**
   * GET /social/map/bounds
   * Returns social profiles strictly within the given geographic bounding box,
   * optionally filtered by a comma-separated list of tag IDs.
   * @query {number} south - Required south latitude
   * @query {number} north - Required north latitude
   * @query {number} west - Required west longitude
   * @query {number} east - Required east longitude
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @returns {GetProfilesResponse}
   */
  fastify.get('/social/map/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'Missing or invalid bounds parameters (south, north, west, east)'
      )
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang
    const { tagIds: rawTagIds, ...bounds } = parsed.data
    const tagIds = parseTagIds(rawTagIds)

    try {
      const profiles = await profileMatchService.findSocialProfilesInBounds(
        myProfileId,
        bounds,
        tagIds,
        [{ updatedAt: 'desc' }]
      )
      const mappedProfiles = profiles.map((p) => mapProfileToPublic(p, false, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch bounded map profiles')
    }
  })

  /**
   * GET /social/map/clusters
   * Returns map clusters for the visible viewport at a given zoom level,
   * optionally filtered by tag IDs.
   * @query {number} south - Bounding box south latitude
   * @query {number} north - Bounding box north latitude
   * @query {number} west - Bounding box west longitude
   * @query {number} east - Bounding box east longitude
   * @query {number} zoom - Map zoom level (0–12)
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @returns {{ success: true, features: MapFeature[] }}
   */
  fastify.get('/social/map/clusters', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const parsed = ClusterQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(reply, 400, 'Missing or invalid parameters (south, north, west, east, zoom)')
    }

    const { south, north, west, east, zoom, tagIds: rawTagIds } = parsed.data
    const bbox: [number, number, number, number] = [west, south, east, north]
    const tagIds = parseTagIds(rawTagIds)

    try {
      const features = await clusterService.getOrBuildClusters(
        req.session.profileId,
        bbox,
        zoom,
        tagIds
      )
      return reply.code(200).send({ success: true, features })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch clusters')
    }
  })

  /**
   * GET /social/map/clusters/leaves
   * Returns the individual profile points that make up a cluster.
   * The `tagIds` param must match the selection used when fetching the
   * cluster itself — each tag combination has its own cached index.
   * @query {number} clusterId - The cluster ID to expand
   * @query {string} [tagIds] - Optional comma-separated tag IDs
   * @returns {{ success: true, features: PointFeature[] }}
   */
  fastify.get(
    '/social/map/clusters/leaves',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      if (!req.session.profile.isSocialActive) {
        return sendForbiddenError(reply)
      }

      const parsed = LeavesQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return sendError(reply, 400, 'Missing or invalid parameter (clusterId)')
      }

      const { clusterId, tagIds: rawTagIds } = parsed.data
      const tagIds = parseTagIds(rawTagIds)
      const features = clusterService.getLeaves(req.session.profileId, clusterId, tagIds)
      return reply.code(200).send({ success: true, features })
    }
  )

  /**
   * GET /dating
   * Returns paginated dating profiles that mutually match the viewer's dating preferences.
   * Requires isDatingActive on the viewer's profile.
   * @query {number} [skip=0] - Offset for pagination
   * @query {number} [take=10] - Page size (max 50)
   * @returns {GetProfilesResponse} Profiles with dating context (like/match state)
   */
  fastify.get('/dating', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { skip, take } = PaginationQuerySchema.parse(req.query)
    return getDatingProfiles(req, reply, [{ updatedAt: 'desc' }], take, skip)
  })

  /**
   * GET /dating/match-ids
   * Returns IDs of all profiles that mutually match the viewer's dating preferences.
   * Returns empty array if dating is not active.
   * @returns {GetMatchIdsResponse} { ids: string[] }
   */
  fastify.get('/dating/match-ids', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isDatingActive) {
      const response: GetMatchIdsResponse = { success: true, ids: [] }
      return reply.code(200).send(response)
    }

    try {
      const ids = await profileMatchService.findMutualMatchIds(req.session.profileId)
      const response: GetMatchIdsResponse = { success: true, ids }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch match IDs')
    }
  })

  /**
   * GET /social/new
   * Returns recently created social profiles (newest first).
   * @query {number} [skip=0] - Offset for pagination
   * @query {number} [take=10] - Page size (max 50)
   * @returns {GetProfilesResponse}
   */
  fastify.get('/social/new', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { skip, take } = PaginationQuerySchema.parse(req.query)

    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findNewProfilesAnywhere(
        myProfileId,
        [{ createdAt: 'desc' }],
        take,
        skip
      )
      const mappedProfiles = profiles.map((p) =>
        mapProfileToPublic(p, false /* includeDatingContext */, locale)
      )
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })

  // ────────────────────────────────────────────────────────────────────
  // DEPRECATED SHIMS — SocialMatchFilter retired
  // ────────────────────────────────────────────────────────────────────
  // Browse filtering is now entirely ephemeral and client-side; there is
  // no persistent match filter anymore. These endpoints are kept solely
  // so that stale frontends (deployed before this refactor) do not crash
  // on `zod.parse()` when they try to load or update the filter.
  //
  // Both return a static minimal DTO that satisfies
  // `SocialMatchFilterDTOSchema` with empty location/tags. PATCH is a
  // no-op that ignores its body and returns the same static DTO.
  //
  // TODO(cleanup): remove these two handlers, together with
  // `SocialMatchFilterDTO` / `GetSocialMatchFilterResponse` from
  // `packages/shared/zod`, once all clients have been updated and
  // dashboards confirm no traffic is hitting these paths.
  // ────────────────────────────────────────────────────────────────────

  const DEPRECATED_SOCIAL_FILTER_DTO: SocialMatchFilterDTO = {
    location: { country: '' },
    radius: 50,
    tags: [],
  }

  /**
   * @deprecated GET /social/filter — shim for retired SocialMatchFilter model.
   * Returns a static empty filter. Kept for stale client compatibility only.
   */
  fastify.get('/social/filter', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const response: GetSocialMatchFilterResponse = {
      success: true,
      filter: DEPRECATED_SOCIAL_FILTER_DTO,
    }
    return reply.code(200).send(response)
  })

  /**
   * @deprecated PATCH /social/filter — shim for retired SocialMatchFilter model.
   * Accepts any body, performs no write, and returns the same static empty
   * filter. Kept for stale client compatibility only.
   */
  fastify.patch('/social/filter', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const response: GetSocialMatchFilterResponse = {
      success: true,
      filter: DEPRECATED_SOCIAL_FILTER_DTO,
    }
    return reply.code(200).send(response)
  })

  const getDatingProfiles = async (
    req: FastifyRequest,
    reply: FastifyReply,
    orderBy: OrderBy,
    take: number = 10,
    skip: number = 0
  ) => {
    if (!req.session.profile.isDatingActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findMutualMatchesFor(
        myProfileId,
        orderBy,
        take,
        skip
      )
      const mappedProfiles = profiles.map((p) =>
        mapProfileToPublic(p, true /* includeDatingContext */, locale)
      )
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  }
}

export default findProfileRoutes
