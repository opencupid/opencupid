import { FastifyPluginAsync, type FastifyReply, type FastifyRequest } from 'fastify'

import { sendError, sendForbiddenError } from '../helpers'

import { ProfileMatchService, type OrderBy } from '@/services/profileMatch.service'
import { GetProfilesResponse, type GetDatingPreferencesResponse, type GetSocialMatchFilterResponse, type UpdateDatingPreferencesResponse } from '@zod/apiResponse.dto'
import { DatingPreferencesDTOSchema, UpdateDatingPreferencesPayloadSchema, UpdateSocialMatchFilterPayloadSchema } from '../../../../../packages/shared/zod/match/filters.dto'
import { ProfileService } from '../../services/profile.service'
import { validateBody } from '../../utils/zodValidate'
import { mapProfileToPublic } from '../mappers/profile.mappers'
import { mapProfileToDatingPreferencesDTO, mapSocialMatchFilterToDTO } from '../mappers/profileMatch.mappers'

const findProfileRoutes: FastifyPluginAsync = async fastify => {

  // instantiate services
  const profileMatchService = ProfileMatchService.getInstance()
  const profileService = ProfileService.getInstance()


  fastify.get('/social', { onRequest: [fastify.authenticate] }, (req, reply) =>
    getSocialProfiles(req, reply, [{ updatedAt: 'desc' }])
  )

  fastify.get('/dating', { onRequest: [fastify.authenticate] }, (req, reply) =>
    getDatingProfiles(req, reply, [{ updatedAt: 'desc' }])
  )

  fastify.get('/social/new', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!req.session.hasActiveProfile || !req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findLocalProfiles(myProfileId, [{ createdAt: 'desc' }], 10)
      const mappedProfiles = profiles.map(p =>
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

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

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
    take: number = 10
  ) => {
    if (!req.session.hasActiveProfile || !req.session.profile.isDatingActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findMutualMatchesFor(myProfileId, orderBy, take)
      const mappedProfiles = profiles.map(p =>
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
    take: number = 10
  ) => {
    if (!req.session.hasActiveProfile || !req.session.profile.isSocialActive) {
      return sendForbiddenError(reply)
    }

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileMatchService.findSocialProfilesFor(myProfileId, orderBy, take)
      const mappedProfiles = profiles.map(p =>
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