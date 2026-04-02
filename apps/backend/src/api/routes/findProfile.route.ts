import { FastifyPluginAsync, type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'

import { sendError, sendForbiddenError } from '../helpers'

import { ProfileMatchService, type OrderBy } from '@/services/profileMatch.service'
import { ClusterService } from '@/services/cluster.service'
import { enqueueClusterRebuild } from '@/queues/clusterQueue'
import {
  GetProfilesResponse,
  type GetMatchIdsResponse,
  type GetSocialMatchFilterResponse,
} from '@zod/apiResponse.dto'
import { UpdateSocialMatchFilterPayloadSchema } from '@shared/zod/match/filters.dto'
import { MAP_MAX_ZOOM } from '@shared/maps'
import { validateBody } from '../../utils/zodValidate'
import { mapProfileToPublic } from '../mappers/profile.mappers'
import { mapSocialMatchFilterToDTO } from '../mappers/profileMatch.mappers'

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

const findProfileRoutes: FastifyPluginAsync = async (fastify) => {
  // instantiate services
  const profileMatchService = ProfileMatchService.getInstance()
  const clusterService = ClusterService.getInstance()

  /**
   * GET /social
   * Returns paginated social profiles matching the viewer's social filter.
   * @query {number} [skip=0] - Offset for pagination
   * @query {number} [take=10] - Page size (max 50)
   * @returns {GetProfilesResponse} Profiles without dating context
   */
  fastify.get('/social', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { skip, take } = PaginationQuerySchema.parse(req.query)
    return getSocialProfiles(req, reply, [{ updatedAt: 'desc' }], take, skip)
  })

  /**
   * GET /social/map
   * Returns social profiles with location data for map display. Optionally filtered by bounds.
   * @query {number} [south] - Bounding box south latitude
   * @query {number} [north] - Bounding box north latitude
   * @query {number} [west] - Bounding box west longitude
   * @query {number} [east] - Bounding box east longitude
   * @returns {GetProfilesResponse}
   */
  fastify.get('/social/map', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang
    const query = req.query as Record<string, string>

    const bounds =
      query.south && query.north && query.west && query.east
        ? {
            south: parseFloat(query.south),
            north: parseFloat(query.north),
            west: parseFloat(query.west),
            east: parseFloat(query.east),
          }
        : undefined

    try {
      const profiles = await profileMatchService.findSocialProfilesWithLocation(
        myProfileId,
        [{ updatedAt: 'desc' }],
        bounds
      )
      const mappedProfiles = profiles.map((p) => mapProfileToPublic(p, false, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch map profiles')
    }
  })

  const BoundsQuerySchema = z.object({
    south: z.coerce.number(),
    north: z.coerce.number(),
    west: z.coerce.number(),
    east: z.coerce.number(),
  })

  const ClusterQuerySchema = z.object({
    south: z.coerce.number(),
    north: z.coerce.number(),
    west: z.coerce.number(),
    east: z.coerce.number(),
    zoom: z.coerce.number().int().min(0).max(MAP_MAX_ZOOM),
  })

  const LeavesQuerySchema = z.object({
    clusterId: z.coerce.number().int(),
  })

  /**
   * GET /social/map/bounds
   * Returns social profiles strictly within the given geographic bounding box.
   * @query {number} south - Required south latitude
   * @query {number} north - Required north latitude
   * @query {number} west - Required west longitude
   * @query {number} east - Required east longitude
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
    const bounds = parsed.data

    try {
      const profiles = await profileMatchService.findSocialProfilesInBounds(myProfileId, bounds, [
        { updatedAt: 'desc' },
      ])
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
   * Returns map clusters for the visible viewport at a given zoom level.
   * @query {number} south - Bounding box south latitude
   * @query {number} north - Bounding box north latitude
   * @query {number} west - Bounding box west longitude
   * @query {number} east - Bounding box east longitude
   * @query {number} zoom - Map zoom level (0–12)
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

    const { south, north, west, east, zoom } = parsed.data
    const bbox: [number, number, number, number] = [west, south, east, north]

    try {
      const features = await clusterService.getOrBuildClusters(req.session.profileId, bbox, zoom)
      return reply.code(200).send({ success: true, features })
    } catch (err) {
      req.log.error(err)
      return sendError(reply, 500, 'Failed to fetch clusters')
    }
  })

  /**
   * GET /social/map/clusters/leaves
   * Returns the individual profile points that make up a cluster.
   * @query {number} clusterId - The cluster ID to expand
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

      const { clusterId } = parsed.data
      const features = clusterService.getLeaves(req.session.profileId, clusterId)
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
   * Returns recently created social profiles (newest first), regardless of location filter.
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

  /**
   * GET /social/filter
   * Returns the current user's social match filter (tag preferences, etc.).
   * @returns {GetSocialMatchFilterResponse}
   */
  fastify.get('/social/filter', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const locale = req.session.lang
    try {
      const fetched = await profileMatchService.getSocialMatchFilter(req.session.profileId)

      if (!fetched) return sendError(reply, 404, 'Profile not found')

      const filter = mapSocialMatchFilterToDTO(fetched, locale)
      const response: GetSocialMatchFilterResponse = { success: true, filter }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load profile')
    }
  })

  /**
   * PATCH /social/filter
   * Updates the current user's social match filter.
   * @body {UpdateSocialMatchFilterPayload}
   * @returns {GetSocialMatchFilterResponse}
   */
  fastify.patch('/social/filter', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = await validateBody(UpdateSocialMatchFilterPayloadSchema, req, reply)
    if (!data) return
    const locale = req.session.lang

    try {
      const updated = await profileMatchService.updateSocialMatchFilter(req.session.profileId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')

      const filter = mapSocialMatchFilterToDTO(updated, locale)
      const response: GetSocialMatchFilterResponse = { success: true, filter }
      clusterService.evict(req.session.profileId)
      enqueueClusterRebuild(req.session.profileId).catch((err) => {
        fastify.log.error(err, 'Failed to enqueue cluster rebuild')
      })
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update social filter')
    }
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

  const getSocialProfiles = async (
    req: FastifyRequest,
    reply: FastifyReply,
    orderBy: OrderBy,
    take: number = 10,
    skip: number = 0
  ) => {
    if (!req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findSocialProfilesFor(
        myProfileId,
        orderBy,
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
  }
}

export default findProfileRoutes
