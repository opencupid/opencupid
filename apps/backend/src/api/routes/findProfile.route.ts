import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { ProfileFilterService } from '@/services/profileFilter.service'
import { ProfileService } from '@/services/profile.service'
import { sendError, sendForbiddenError } from '../helpers'
import { mapProfileToPublic, mapProfileWithContext, mapProfileToDatingPreferences } from '../mappers/profile.mappers'
import { GetProfilesResponse, GetDatingPreferenceseResponse, UpdateDatingPreferencesResponse } from '@zod/apiResponse.dto'
import { DatingPreferencesDTOSchema, UpdateDatingPreferencesPayloadSchema } from '@zod/match/datingPreference.dto'
import { validateBody } from '@/utils/zodValidate'

const findProfileRoutes: FastifyPluginAsync = async fastify => {

  // instantiate services
  const profileFilterService = ProfileFilterService.getInstance()
  const profileService = ProfileService.getInstance()


  fastify.get('/social', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile || !req.session.profile.isSocialActive) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileFilterService.findSocialProfilesFor(myProfileId)
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
      const profiles = await profileFilterService.findMutualMatchesFor(myProfileId)
      const mappedProfiles = profiles.map(p => mapProfileToPublic(p, true /* hasDatingPermission*/, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })

  fastify.get('/datingprefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

    try {
      const datingFilter = await profileFilterService.getDatingFilter(req.session.profileId)
      if (!datingFilter) {
        // Return default/empty preferences if no filter exists yet
        const defaultPrefs = {
          prefAgeMin: null,
          prefAgeMax: null,
          prefGender: [],
          prefKids: [],
        }
        const response: GetDatingPreferenceseResponse = { success: true, prefs: defaultPrefs }
        return reply.code(200).send(response)
      }

      const datingPrefs = DatingPreferencesDTOSchema.parse(datingFilter)
      const response: GetDatingPreferenceseResponse = { success: true, prefs: datingPrefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load dating preferences')
    }
  })

  fastify.patch('/datingprefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const data = await validateBody(UpdateDatingPreferencesPayloadSchema, req, reply)
    if (!data) return

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

    try {
      const updated = await profileFilterService.upsertDatingFilter(req.session.profileId, data)
      const prefs = DatingPreferencesDTOSchema.parse(updated)
      const response: UpdateDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update dating preferences')
    }
  })


}

export default findProfileRoutes