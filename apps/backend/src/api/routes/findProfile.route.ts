import { FastifyPluginAsync, type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'

import { sendError, sendForbiddenError } from '../helpers'

import { ProfileMatchService, type OrderBy } from '@/services/profileMatch.service'
import {
  GetProfilesResponse,
  type GetDatingPreferencesResponse,
  type GetMatchIdsResponse,
  type GetSocialMatchFilterResponse,
  type UpdateDatingPreferencesResponse,
} from '@zod/apiResponse.dto'
import {
  DatingPreferencesDTOSchema,
  UpdateDatingPreferencesPayloadSchema,
  UpdateSocialMatchFilterPayloadSchema,
} from '../../../../../packages/shared/zod/match/filters.dto'
import { ProfileService } from '../../services/profile.service'
import { validateBody } from '../../utils/zodValidate'
import { mapProfileToPublic } from '../mappers/profile.mappers'
import {
  mapProfileToDatingPreferencesDTO,
  mapSocialMatchFilterToDTO,
} from '../mappers/profileMatch.mappers'

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
  const profileService = ProfileService.getInstance()

  fastify.get('/social', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { skip, take } = PaginationQuerySchema.parse(req.query)
    return getSocialProfiles(req, reply, [{ updatedAt: 'desc' }], take, skip)
  })

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

  fastify.get('/dating', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { skip, take } = PaginationQuerySchema.parse(req.query)
    return getDatingProfiles(req, reply, [{ updatedAt: 'desc' }], take, skip)
  })

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

  fastify.get('/dating/filter', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const fetched = await profileService.getProfileByUserId(req.user.userId)
      if (!fetched) return sendError(reply, 404, 'Profile not found')

      const datingPrefs = mapProfileToDatingPreferencesDTO(fetched)
      const response: GetDatingPreferencesResponse = { success: true, prefs: datingPrefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load profile')
    }
  })

  fastify.patch('/dating/filter', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = await validateBody(UpdateDatingPreferencesPayloadSchema, req, reply)
    if (!data) return

    try {
      const updated = await profileService.updateProfileScalars(req.user.userId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')
      const prefs = DatingPreferencesDTOSchema.parse(updated)
      const response: UpdateDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update dating preferences')
    }
  })

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

  fastify.patch('/social/filter', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = await validateBody(UpdateSocialMatchFilterPayloadSchema, req, reply)
    if (!data) return
    const locale = req.session.lang

    try {
      const updated = await profileMatchService.updateSocialMatchFilter(req.session.profileId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')

      const filter = mapSocialMatchFilterToDTO(updated, locale)
      const response: GetSocialMatchFilterResponse = { success: true, filter }
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
