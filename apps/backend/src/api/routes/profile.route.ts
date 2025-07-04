import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { appConfig } from '@/lib/appconfig'
import { validateBody } from '@/utils/zodValidate'

import {
  type UpdateProfilePayload,
  type UpdateProfileScopePayload,
  UpdateProfilePayloadSchema,
  UpdateProfileScopeSchemaPayload
} from '@zod/profile/profile.dto'

import {
  rateLimitConfig,
  sendError,
  sendForbiddenError
} from '../helpers'
import {
  mapDbProfileToOwnerProfile,
  mapProfileSummary,
  mapProfileToPublic,
  mapProfileWithContext,
} from '@/api/mappers/profile.mappers'
import type {
  GetMyProfileResponse,
  GetPublicProfileResponse,
  UpdateProfileResponse,
} from '@zod/apiResponse.dto'
import { GetProfileSummariesResponse } from '@zod/apiResponse.dto'

import { ProfileService } from 'src/services/profile.service'
import { ProfileMatchService } from '@/services/profileMatch.service'

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
  const profileMatchService = ProfileMatchService.getInstance()

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
      const raw = await profileService.getProfileWithContextById(id, myProfileId)
      if (!raw) return sendError(reply, 404, 'Profile not found')

      // the profile being requested has blocked the current profile
      if (raw.blockedProfiles.length > 0) {
        // intentionally returning a vague 404 for privacy reasons
        return sendError(reply, 404, 'This profile does not exist')
      }

      if (raw.userId !== req.user.userId && !req.session.hasActiveProfile) {
        return sendForbiddenError(reply, 'You do not have access to this profile')
      }

      let includeDatingContext = false
      if (raw.isDatingActive && req.session.profile.isDatingActive) {
        includeDatingContext = await profileMatchService.areProfilesMutuallyCompatible(myProfileId, raw.id)
      }

      const profile = mapProfileWithContext(raw, includeDatingContext, locale)
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


  // fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {

  //   if (!req.session.hasActiveProfile) return sendForbiddenError(reply)
  //   const myProfileId = req.session.profileId
  //   const locale = req.session.lang

  //   try {
  //     const profiles = await profileService.findProfilesFor(locale, myProfileId)
  //     const hasDatingPermission = req.session.profile.isDatingActive
  //     const mappedProfiles = profiles.map(p => mapProfileWithContext(p, hasDatingPermission, locale))
  //     const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
  //     return reply.code(200).send(response)
  //   } catch (err) {
  //     fastify.log.error(err)
  //     return sendError(reply, 500, 'Failed to fetch profiles')
  //   }
  // })

  /**
   * Create a new profile for the current user
   * @description This route is used to create a new profile for the current user.
   * It sets the onboarding flag to true, indicating that the user has completed the onboarding process.
   */
  fastify.post('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    const data = await validateBody(UpdateProfilePayloadSchema, req, reply) as UpdateProfilePayload
    if (!data) return

    // check if the user already has an onboarded profile. Since we're allowing the setting of
    // isDatingActive and isSocialActive here, we need to ensure that those flags can only be set once
    // and later via the PATCH /scopes route which is rate limited
    const existing = await profileService.getProfileByUserId(req.user.userId)
    if (existing && existing.isOnboarded) {
      return sendError(reply, 403, 'Profile already exists and is onboarded')
    }

    // @ts-expect-error - We are setting isOnboarded here, which is not part of CreateProfilePayload
    //  i'm not gonna bloody write a transform for this
    data.isOnboarded = true // Set the onboarding flag to true

    const locale = req.session.lang

    try {
      const updated = await fastify.prisma.$transaction(async tx => {
        const updatedProfile = await profileService.updateCompleteProfile(tx, locale, req.user.userId, data)
        const profile = mapDbProfileToOwnerProfile(locale, updatedProfile)
        // Create the default social match filter for the new profile
        await profileMatchService.createSocialMatchFilter(tx, updatedProfile.id, profile.location)
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

  })

  /**
   * Update the current user's profile
   */
  fastify.patch('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = await validateBody(UpdateProfilePayloadSchema, req, reply) as UpdateProfilePayload
    // destructure to remove isSocialActive and isDatingActive
    if (!data) return
    const { isSocialActive, isDatingActive, ...rest } = data
    return updateProfile(rest, req, reply)
  })

  async function updateProfile(profileData: UpdateProfilePayload, req: FastifyRequest, reply: FastifyReply) {
    const locale = req.session.lang

    try {
      const updated = await fastify.prisma.$transaction(async tx => {
        const updatedProfile = await profileService.updateCompleteProfile(tx, locale, req.user.userId, profileData)
        const profile = mapDbProfileToOwnerProfile(locale, updatedProfile)
        return profile
      })

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

  fastify.patch('/scopes', {
    onRequest: [fastify.authenticate],
    config: {
      ...rateLimitConfig(fastify, '1 day', appConfig.RATE_LIMIT_PROFILE_SCOPES),
    },

  }, async (req, reply) => {

    const data = await validateBody(UpdateProfileScopeSchemaPayload, req, reply) as UpdateProfileScopePayload
    if (!data) return
    const locale = req.session.lang

    try {
      const updated = await profileService.updateScopes(req.user.userId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')
      // Clear session to force re-fetch on next request, we need the roles updated
      await req.deleteSession()

      const profile = mapDbProfileToOwnerProfile(locale, updated)
      const response: UpdateProfileResponse = { success: true, profile }
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to update profile scopes')
    }

  })


  fastify.post('/:id/block', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const { id } = IdLookupParamsSchema.parse(req.params);
      if (profileId === id) {
        return reply.code(400).send({ error: 'Cannot block yourself.' });
      }
      await profileService.blockProfile(profileId, id);
      return reply.code(204).send();

    } catch (error) {
      fastify.log.error(error);
      return sendError(reply, 500, 'Failed to block profile');
    }
  });

  fastify.post('/:id/unblock', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const { id } = IdLookupParamsSchema.parse(req.params);
      await profileService.unblockProfile(profileId, id);
      return reply.code(204).send();

    } catch (error) {
      fastify.log.error(error);
      return sendError(reply, 500, 'Failed to unblock profile');
    }
  });

  fastify.get('/blocked', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const profiles = await profileService.getBlockedProfiles(profileId)
      const mappedProfiles = profiles.map(p => mapProfileSummary(p))
      const response: GetProfileSummariesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)

    } catch (error) {
      fastify.log.error(error);
      return sendError(reply, 500, 'Failed to fetch blocked profiles');
    }
  });
}

export default profileRoutes
