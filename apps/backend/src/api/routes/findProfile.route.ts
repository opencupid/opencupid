import { FastifyPluginAsync, type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'

import { BoundsQuerySchema } from '@zod/dto/bounds.dto'

import { sendError, sendForbiddenError } from '../helpers'

import { ProfileMatchService, type OrderBy } from '@/services/profileMatch.service'
import { ClusterService } from '@/services/cluster.service'
import {
  GetProfilesResponse,
  type GetMatchIdsResponse,
  type GetSocialMatchFilterResponse,
} from '@zod/apiResponse.dto'
import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'

import { MAP_MAX_ZOOM } from '@shared/maps'
import { mapProfileToPublic } from '../mappers/profile.mappers'
import { mapProfileTagsTranslated } from '../mappers/tag.mappers'

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
 * Maximum number of tag IDs accepted on filter query params. Caps the
 * Prisma `IN` filter size, the cluster cache key length, and the cache
 * key explosion across user/tag-set combinations. Must stay in sync with
 * `MAX_BROWSE_TAGS` in
 * `apps/frontend/src/features/browse/stores/browseFiltersStore.ts`.
 */
const MAX_TAG_IDS = 5

/** Coarse opaque-ID shape check (alphanumeric, 8–32 chars). */
const TAG_ID_RE = /^[a-z0-9]{8,32}$/i

/**
 * Parse a comma-separated `tagIds` query param into a deduped string array.
 * Returns `[]` for undefined / empty / whitespace-only values. Returns
 * `null` if the input is malformed (too many IDs or any ID fails the
 * shape check) — callers should map this to a 400.
 */
function parseTagIds(raw: unknown): string[] | null {
  if (typeof raw === 'undefined' || raw === null) return []
  if (typeof raw !== 'string') return null
  if (raw.trim().length === 0) return []
  const deduped = Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
  )
  if (deduped.length === 0) return []
  if (deduped.length > MAX_TAG_IDS) return null
  if (!deduped.every((id) => TAG_ID_RE.test(id))) return null
  return deduped
}

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  // instantiate services
  const profileMatchService = ProfileMatchService.getInstance()
  const clusterService = ClusterService.getInstance(fastify.prisma)

  const ClusterQuerySchema = BoundsQuerySchema.extend({
    zoom: z.coerce.number().int().min(0).max(MAP_MAX_ZOOM),
    tagIds: z.string().optional(),
  })

  const LeavesQuerySchema = z.object({
    clusterId: z.coerce.number().int(),
    tagIds: z.string().optional(),
  })

  /**
   * @deprecated GET /social/map/bounds — replaced by /social/map/clusters.
   * Returns a static empty response. Kept for stale client compatibility only.
   * TODO(cleanup): remove once all clients have been updated and dashboards
   * confirm no traffic is hitting this path.
   */
  fastify.get('/social/map/bounds', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const response: GetProfilesResponse = { success: true, profiles: [] }
    return reply.code(200).send(response)
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
   * @returns {{ success: true, features: MapFeature[], tags: PublicTag[] }}
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
    if (tagIds === null) {
      return sendError(reply, 400, `Invalid tagIds (max ${MAX_TAG_IDS}, alphanumeric only)`)
    }

    try {
      const { features, tags: rawTags } = await clusterService.getOrBuildClusters(
        req.session.profileId,
        bbox,
        zoom,
        tagIds
      )
      const tags = mapProfileTagsTranslated(rawTags, req.session.lang)
      return reply.code(200).send({ success: true, features, tags })
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
      if (tagIds === null) {
        return sendError(reply, 400, `Invalid tagIds (max ${MAX_TAG_IDS}, alphanumeric only)`)
      }
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
