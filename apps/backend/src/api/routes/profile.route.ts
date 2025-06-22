import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import {
  type UpdateProfilePayload,
  UpdateProfilePayloadSchema
} from '@zod/profile/profile.dto'

import { ProfileService } from 'src/services/profile.service'
import { validateBody } from '@/utils/zodValidate'
import {
  sendError,
  sendForbiddenError,
  sendUnauthorizedError
} from '../helpers'
import {
  mapDbProfileToOwnerProfile,
  mapProfileToDatingPreferences,
  mapProfileToPublic,
  mapProfileWithConversationToPublic,
} from '@/api/mappers/profile.mappers'
import { UserService } from 'src/services/user.service'
import type {
  GetMyProfileResponse,
  GetPublicProfileResponse,
  GetProfilesResponse,
  UpdateProfileResponse,
  GetDatingPreferenceseResponse,
  UpdateDatingPreferencesResponse,
} from '@shared/dto/apiResponse.dto'
import { DatingPreferencesDTOSchema, UpdateDatingPreferencesPayloadSchema } from '@zod/match/datingPreference.dto'

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})


const PreviewLookupParamsSchema = z.object({
  id: z.string().cuid(),
  locale: z.string()
})



const profileRoutes: FastifyPluginAsync = async fastify => {

  // instantiate services
  const profileService = ProfileService.getInstance()
  const userService = UserService.getInstance()

  /**
   * Get the current user's profile
   * @description This route retrieves the current user's social and dating profiles.
   */
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const locale = req.session.lang

    try {
      const fetched = await profileService.getProfileCompleteByUserId(req.user.userId)
      if (!fetched) return sendError(reply, 404, 'Social profile not found')

      const profile = mapDbProfileToOwnerProfile(locale, fetched)
      const response: GetMyProfileResponse = { success: true, profile }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load profile')
    }
  })

  /**
   * Get a profile by ID
   * @param {string} id - The id of the profile to retrieve
   */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const { id } = IdLookupParamsSchema.parse(req.params)
      const raw = await profileService.getProfileWithConversationsById(id, myProfileId)
      if (!raw) return sendError(reply, 404, 'Profile not found')

      if (raw.userId !== req.user.userId && !req.session.hasActiveProfile) {
        return sendForbiddenError(reply, 'You do not have access to this profile')
      }
      const hasDatingPermission = req.session.profile.isDatingActive

      const profile = mapProfileWithConversationToPublic(raw, hasDatingPermission, locale)
      // const profile = publicProfileSchema.parse(raw)
      const response: GetPublicProfileResponse = { success: true, profile }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile')
    }
  })

  fastify.get('/preview/:locale/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const myProfileId = req.session.profileId

    try {
      const { id, locale } = PreviewLookupParamsSchema.parse(req.params)

      if (id !== myProfileId) {
        return sendForbiddenError(reply, 'You do not have access to this profile')
      }

      const raw = await profileService.getProfileCompleteById(id)
      if (!raw) return sendError(reply, 404, 'Profile not found')

      const hasDatingPermission = true

      const profile = mapProfileToPublic(raw, hasDatingPermission, locale)
      // const profile = publicProfileSchema.parse(raw)
      const response: GetPublicProfileResponse = { success: true, profile }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile')
    }
  })


  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await profileService.findProfilesFor(locale, myProfileId)
      const hasDatingPermission = req.session.profile.isDatingActive
      const mappedProfiles = profiles.map(p => mapProfileWithConversationToPublic(p, hasDatingPermission, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })

  /**
   * Update the current user's profile
   */
  fastify.patch('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const data = await validateBody(UpdateProfilePayloadSchema, req, reply) as UpdateProfilePayload
    if (!data) return
    // @ts-expect-error - We are setting isOnboarded here, which is not part of CreateProfilePayload
    //  i'm not gonna bloody write a transform for this
    data.isOnboarded = true // Set the onboarding flag to true
    return updateProfile(data, req, reply)
  })


  async function updateProfile(profileData: UpdateProfilePayload, req: FastifyRequest, reply: FastifyReply) {
    const user = await userService.getUserById(req.user.userId)
    if (!user) return sendUnauthorizedError(reply)

    // // set flags on user object (these are used in authorization)
    // if (profileData.isDatingActive) {
    //   userService.addRole(user, 'user_dating')
    // } else {
    //   userService.removeRole(user, 'user_dating')
    // }
    user.hasActiveProfile = [profileData.isDatingActive, profileData.isSocialActive].some(Boolean)
    const locale = req.session.lang

    try {
      const updated = await fastify.prisma.$transaction(async tx => {
        const updatedProfile = await profileService.updateCompleteProfile(tx, locale, req.user.userId, profileData)
        // if (!updatedProfile) return sendError(reply, 404, 'Profile not found')
        const profile = mapDbProfileToOwnerProfile(locale, updatedProfile)

        // Mark user as onboarded
        user.isOnboarded = true
        const updatedUser = await userService.updateUser(tx, user)
        if (!updatedUser) return sendError(reply, 500, 'Failed to update user')
        return profile
      })

      // Clear session to force re-fetch on next request, we need the roles updated
      await req.deleteSession()
      const response: UpdateProfileResponse = { success: true, profile: updated }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      // profileService.updateProfile() returned null, which means the profile was not found
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return sendError(reply, 404, 'Profile not found')
      }
      return sendError(reply, 500, 'Failed to update profile')
    }
  }


  fastify.get('/datingprefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (req.session.profile.isDatingActive === false) {
      return sendForbiddenError(reply, 'Dating preferences are not active for this profile')
    }

    try {
      const fetched = await profileService.getProfileByUserId(req.user.userId)
      if (!fetched) return sendError(reply, 404, 'Profile not found')

      const datingPrefs = mapProfileToDatingPreferences(fetched)
      const response: GetDatingPreferenceseResponse = { success: true, prefs: datingPrefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load profile')
    }
  })

  fastify.patch('/datingprefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const data = await validateBody(UpdateDatingPreferencesPayloadSchema, req, reply)
    if (!data) return

    try {
      const updated = await profileService.updateProfile(req.user.userId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')
      const prefs = DatingPreferencesDTOSchema.parse(updated)
      const response: UpdateDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update dating preferences')
    }

  })

}

export default profileRoutes
