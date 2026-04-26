import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { validateBody } from '@/utils/zodValidate'

import {
  type UpdateProfileOptInPayload,
  type UpdateProfilePayload,
  type UpdateProfileScopePayload,
  type CreateProfilePayload,
  UpdateProfileOptInPayloadSchema,
  UpdateProfilePayloadSchema,
  CreateProfilePayloadSchema,
  UpdateProfileScopeSchemaPayload,
} from '@zod/profile/profile.dto'

import { rateLimitConfig, sendError, sendForbiddenError } from '../helpers'
import {
  mapDbProfileToOwnerProfile,
  mapProfileSummary,
  mapProfileToPublic,
  mapProfileWithContext,
} from '@/api/mappers/profile.mappers'
import type {
  GetDatingPreferencesResponse,
  GetProfileOptInResponse,
  GetMyProfileResponse,
  GetPublicProfileResponse,
  UpdateDatingPreferencesResponse,
  UpdateProfileOptInResponse,
  UpdateProfileResponse,
  UpdateProfileScopeResponse,
} from '@zod/apiResponse.dto'
import { GetProfileSummariesResponse } from '@zod/apiResponse.dto'
import { UpdateDatingPreferencesPayloadSchema } from '@zod/match/filters.dto'
import { mapProfileToDatingPreferencesDTO } from '@/api/mappers/profileMatch.mappers'
import { createDatingPrefsDefaults, DatingPreferencesFormSchema } from '@zod/match/filters.form'

import { ProfileService } from '@/services/profile.service'
import { ProfileMatchService } from '@/services/profileMatch.service'
import { MessageService } from '../../services/messaging.service'
import { ClusterService } from '@/services/cluster.service'

const RATE_LIMIT_PROFILE_SCOPES = 5 // max scope toggles per day

// Route params for ID lookups
const IdLookupParamsSchema = z.object({
  id: z.string().cuid(),
})

const PreviewLookupParamsSchema = z.object({
  id: z.string().cuid(),
  locale: z.string(),
})

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // instantiate services
  const profileService = ProfileService.getInstance()
  const profileMatchService = ProfileMatchService.getInstance()
  const messageService = MessageService.getInstance()
  const clusterService = ClusterService.getInstance()

  /**
   * GET /me
   * Returns the current user's complete profile (owner view — includes private fields).
   * @returns {GetMyProfileResponse}
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
   * GET /me/optin
   * Returns opt-in flags (push notifications, newsletter, etc.) for the current user.
   * @returns {GetProfileOptInResponse}
   */
  fastify.get('/me/optin', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const optIn = await profileService.getOptInSettingsByProfileId(req.session.profileId)
      if (!optIn) return sendError(reply, 404, 'Social profile not found')
      const response: GetProfileOptInResponse = { success: true, optIn }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load opt-in settings')
    }
  })

  /**
   * PATCH /me/optin
   * Updates opt-in flags. Disabling push notifications also deletes all push subscriptions.
   * @body {UpdateProfileOptInPayload}
   * @returns {UpdateProfileOptInResponse}
   */
  fastify.patch('/me/optin', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = (await validateBody(
      UpdateProfileOptInPayloadSchema,
      req,
      reply
    )) as UpdateProfileOptInPayload
    if (!data) return

    try {
      const optIn = await fastify.prisma.$transaction(async (tx) => {
        if (data.isPushNotificationEnabled === false) {
          await tx.pushSubscription.deleteMany({ where: { userId: req.user.userId } })
        }
        return profileService.updateOptInSettingsByUserId(tx, req.user.userId, data)
      })
      const response: UpdateProfileOptInResponse = { success: true, optIn }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return sendError(reply, 404, 'Profile not found')
      }
      return sendError(reply, 500, 'Failed to update opt-in settings')
    }
  })

  /**
   * GET /me/dating-prefs
   * Returns dating preferences. Initializes defaults from profile data if not yet set.
   * @returns {GetDatingPreferencesResponse}
   */
  fastify.get('/me/dating-prefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      let fetched = await profileService.getProfileByUserId(req.user.userId)
      if (!fetched) return sendError(reply, 404, 'Profile not found')

      if (fetched.prefAgeMin === null) {
        const defaults = DatingPreferencesFormSchema.parse(createDatingPrefsDefaults(fetched))
        fetched = await profileService.updateProfileScalars(req.user.userId, defaults)
      }

      const prefs = mapProfileToDatingPreferencesDTO(fetched)
      const response: GetDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to load dating preferences')
    }
  })

  /**
   * PATCH /me/dating-prefs
   * Updates dating preference filters (age range, distance, gender, etc.).
   * @body {UpdateDatingPreferencesPayload}
   * @returns {UpdateDatingPreferencesResponse}
   */
  fastify.patch('/me/dating-prefs', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = await validateBody(UpdateDatingPreferencesPayloadSchema, req, reply)
    if (!data) return

    try {
      const updated = await profileService.updateProfileScalars(req.user.userId, data)
      if (!updated) return sendError(reply, 404, 'Profile not found')
      const prefs = mapProfileToDatingPreferencesDTO(updated)
      const response: UpdateDatingPreferencesResponse = { success: true, prefs }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to update dating preferences')
    }
  })

  /**
   * GET /:id
   * Returns a public profile with interaction context (like/match/conversation state).
   * Dating context is only included when both profiles have dating active and are mutually compatible.
   * Returns 404 if the target profile has blocked the viewer (intentionally vague for privacy).
   * @param {string} id - Target profile ID (CUID)
   * @returns {GetPublicProfileResponse}
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
        includeDatingContext = await profileMatchService.areProfilesMutuallyCompatible(
          myProfileId,
          raw.id
        )
      }

      const profile = mapProfileWithContext(raw, includeDatingContext, locale)
      const response: GetPublicProfileResponse = { success: true, profile }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile')
    }
  })

  /**
   * GET /preview/:locale/:id
   * Returns a preview of the viewer's own profile as others would see it, in the given locale.
   * Only accessible for the viewer's own profile.
   * @param {string} locale - Locale code for tag/field translations
   * @param {string} id - Profile ID (must match the authenticated user's profile)
   * @returns {GetPublicProfileResponse}
   */
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

  /**
   * POST /me
   * Creates/activates the current user's profile (onboarding completion).
   * Sets isOnboarded=true, clears the session to refresh roles, and sends
   * a welcome message. Can only be called once per user.
   * @body {CreateProfilePayload} Profile data including isDatingActive, isSocialActive
   * @returns {UpdateProfileResponse}
   */
  fastify.post('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = (await validateBody(
      CreateProfilePayloadSchema,
      req,
      reply
    )) as CreateProfilePayload
    if (!data) return

    // check if the user already has an onboarded profile. Since we're allowing the setting of
    // isDatingActive and isSocialActive here, we need to ensure that those flags can only be set once
    // and later via the PATCH /scopes route which is rate limited
    const existing = await profileService.getProfileByUserId(req.user.userId)
    if (existing && existing.isOnboarded) {
      return sendError(reply, 403, 'Profile already exists and is onboarded')
    }

    const locale = req.session.lang

    try {
      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedProfile = await profileService.updateCompleteProfile(
          tx,
          locale,
          req.user.userId,
          { ...data, isOnboarded: true }
        )
        return mapDbProfileToOwnerProfile(locale, updatedProfile)
      })
      // Update session so the next request sees hasActiveProfile=true without a round-trip
      await req.updateSession({
        hasActiveProfile: updated.isActive,
        profile: {
          id: updated.id,
          isDatingActive: updated.isDatingActive,
          isSocialActive: updated.isSocialActive,
          isActive: updated.isActive,
        },
      })
      const response: UpdateProfileResponse = { success: true, profile: updated }
      reply.code(200).send(response)

      // send welcome message
      // additional try-catch to avoid breaking the profile creation flow
      // if it blows up
      try {
        await messageService.sendWelcomeMessage(updated.id, req.session.lang)
      } catch (error) {
        fastify.log.warn({ err: error }, 'Failed to send welcome message')
      }
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
   * PATCH /me
   * Updates the current user's profile fields. Strips isDatingActive/isSocialActive
   * from the payload — those can only be changed via PATCH /scopes.
   * @body {UpdateProfilePayload}
   * @returns {UpdateProfileResponse}
   */
  fastify.patch('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const data = (await validateBody(
      UpdateProfilePayloadSchema,
      req,
      reply
    )) as UpdateProfilePayload
    // destructure to remove isSocialActive and isDatingActive
    if (!data) return
    const { isSocialActive, isDatingActive, ...rest } = data
    return updateProfile(rest, req, reply)
  })

  async function updateProfile(
    profileData: UpdateProfilePayload,
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    const locale = req.session.lang

    try {
      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedProfile = await profileService.updateCompleteProfile(
          tx,
          locale,
          req.user.userId,
          profileData
        )
        const profile = mapDbProfileToOwnerProfile(locale, updatedProfile)
        return profile
      })

      clusterService.evict(updated.id)
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

  /**
   * PATCH /scopes
   * Toggles dating/social active flags. Rate-limited per day to prevent abuse.
   * Updates the session with new scope data so subsequent requests see the change immediately.
   * @body {UpdateProfileScopePayload} { isDatingActive?, isSocialActive? }
   * @returns {UpdateProfileScopeResponse}
   */
  fastify.patch(
    '/scopes',
    {
      onRequest: [fastify.authenticate],
      config: {
        ...rateLimitConfig(fastify, '1 day', RATE_LIMIT_PROFILE_SCOPES),
      },
    },
    async (req, reply) => {
      const data = (await validateBody(
        UpdateProfileScopeSchemaPayload,
        req,
        reply
      )) as UpdateProfileScopePayload
      if (!data) return

      try {
        const updated = await profileService.updateScopes(req.user.userId, data)
        if (!updated) return sendError(reply, 404, 'Profile not found')
        // Update session with new profile scope data
        await req.updateSession({
          hasActiveProfile: updated.isActive,
          profile: {
            id: updated.id,
            isDatingActive: updated.isDatingActive,
            isSocialActive: updated.isSocialActive,
            isActive: updated.isActive,
          },
        })
        clusterService.evict(updated.id)

        const response: UpdateProfileScopeResponse = {
          success: true,
          isDatingActive: updated.isDatingActive,
          isActive: updated.isActive,
        }
        return reply.code(200).send(response)
      } catch (error: any) {
        if (error.name === 'DatingEligibilityError') {
          return sendError(reply, 403, error.message)
        }
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to update profile scopes')
      }
    }
  )

  /**
   * POST /:id/block
   * Blocks a profile. The blocked profile will see 404 when viewing the blocker.
   * @param {string} id - Profile ID to block (CUID)
   * @returns 204
   */
  fastify.post('/:id/block', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const { id } = IdLookupParamsSchema.parse(req.params)
      if (profileId === id) {
        return reply.code(400).send({ error: 'Cannot block yourself.' })
      }
      await profileService.blockProfile(profileId, id)
      clusterService.evict(profileId)
      return reply.code(204).send()
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to block profile')
    }
  })

  /**
   * POST /:id/unblock
   * Removes a block on a profile.
   * @param {string} id - Profile ID to unblock (CUID)
   * @returns 204
   */
  fastify.post('/:id/unblock', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const { id } = IdLookupParamsSchema.parse(req.params)
      await profileService.unblockProfile(profileId, id)
      clusterService.evict(profileId)
      return reply.code(204).send()
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to unblock profile')
    }
  })

  /**
   * GET /blocked
   * Returns a list of profiles the current user has blocked.
   * @returns {GetProfileSummariesResponse}
   */
  fastify.get('/blocked', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    try {
      const profiles = await profileService.getBlockedProfiles(profileId)
      const mappedProfiles = profiles.map((p) => mapProfileSummary(p))
      const response: GetProfileSummariesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error(error)
      return sendError(reply, 500, 'Failed to fetch blocked profiles')
    }
  })
}

export default profileRoutes
