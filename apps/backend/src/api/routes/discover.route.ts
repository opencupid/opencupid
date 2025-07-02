import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { MatchQueryService } from '@/services/matchQuery.service'
import { ProfileFilterService } from '@/services/profileFilter.service'
import { ProfileService } from '@/services/profile.service'
import { sendError, sendForbiddenError } from '../helpers'
import { mapProfileToPublic, mapProfileWithContext } from '../mappers/profile.mappers'
import { GetProfilesResponse, GetDatingPreferenceseResponse, UpdateDatingPreferencesResponse } from '@zod/apiResponse.dto'
import { validateBody } from '@/utils/zodValidate'
import { UpdateDatingPreferencesPayloadSchema } from '@zod/match/datingPreference.dto'

const profileDiscoveryRoutes: FastifyPluginAsync = async fastify => {

  // instantiate services
  const matchQueryService = MatchQueryService.getInstance()
  const profileFilterService = ProfileFilterService.getInstance()


  fastify.get('/social', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile || !req.session.profile.isSocialActive) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await matchQueryService.findSocialProfilesFor(myProfileId)
      const hasDatingPermission = req.session.profile.isDatingActive
      const mappedProfiles = profiles.map(p => mapProfileToPublic(p, hasDatingPermission, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })


  fastify.get('/dating', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile || !req.session.profile.isDatingActive) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await matchQueryService.findMutualMatchesFor(myProfileId)
      const mappedProfiles = profiles.map(p => mapProfileToPublic(p, true /* hasDatingPermission*/, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })

  // Dating preferences routes
  fastify.get('/preferences', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

    try {
      const prefs = await profileFilterService.getDatingPreferences(req.session.profileId)
      const datingPrefs = profileFilterService.mapToDatingPreferencesDTO(prefs)
      const response: GetDatingPreferenceseResponse = { success: true, prefs: datingPrefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load dating preferences')
    }
  })

  fastify.patch('/preferences', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const data = await validateBody(UpdateDatingPreferencesPayloadSchema, req, reply)
    if (!data) return

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

    try {
      const updated = await profileFilterService.updateDatingPreferences(req.session.profileId, data)
      const prefs = profileFilterService.mapToDatingPreferencesDTO(updated)
      const response: UpdateDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update dating preferences')
    }
  })


}

export default profileDiscoveryRoutes