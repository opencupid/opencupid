import { FastifyPluginAsync } from 'fastify'
import z from 'zod'
import { rateLimitConfig, sendError } from '../helpers'
import type {
  InteractionContextResponse,
  InteractionEdgeResponse,
  InteractionEdgesResponse,
  InteractionStatsResponse,
  ReceivedLikesResponse,
} from '@zod/apiResponse.dto'
import { InteractionService } from '@/services/interaction.service'
import { ProfileService } from '@/services/profile.service'
import { ProfileMatchService } from '@/services/profileMatch.service'
import { mapInteractionContext } from '@/api/mappers/interaction.mappers'
import { broadcastToProfile } from '@/utils/wsUtils'
import { notifierService } from '@/services/notifier.service'
import { appConfig } from '@/lib/appconfig'

// Route params for ID lookups
const TargetLookupParamsSchema = z.object({
  targetId: z.string().cuid(),
})

const RATE_LIMIT_LIKE_OR_PASS = 3 // per-minute ceiling for deliberate like/pass actions

const interactionRoutes: FastifyPluginAsync = async (fastify) => {
  const service = InteractionService.getInstance()
  const profileService = ProfileService.getInstance()
  const profileMatchService = ProfileMatchService.getInstance()

  /**
   * GET /context/:targetId
   * Returns the viewer's interaction context with the target profile —
   * conversation state plus (when both sides are dating-active and mutually
   * compatible) dating state. Hidden behind a 404 when the target has blocked
   * the viewer, matching the privacy contract of GET /profiles/:id.
   * @param {string} targetId - Profile ID to read context for (CUID)
   * @returns {InteractionContextResponse}
   */
  fastify.get<{ Params: { targetId: string } }>(
    '/context/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 60),
    },
    async (req, reply) => {
      const { targetId } = TargetLookupParamsSchema.parse(req.params)
      const myId = req.session.profileId

      try {
        const raw = await profileService.getInteractionContextSourceById(targetId, myId)
        if (!raw) return sendError(reply, 404, 'Profile not found')
        if (raw.blockedProfiles.length > 0) {
          return sendError(reply, 404, 'This profile does not exist')
        }

        let includeDatingContext = false
        if (raw.isDatingActive && req.session.profile.isDatingActive) {
          includeDatingContext = await profileMatchService.areProfilesMutuallyCompatible(
            myId,
            raw.id
          )
        }

        const context = mapInteractionContext(raw, includeDatingContext, myId)
        const response: InteractionContextResponse = { success: true, context }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to fetch interaction context')
      }
    }
  )

  /**
   * GET /
   * Returns a dashboard summary: sent likes, matches, received likes (up to 4), and new match count.
   * @returns {InteractionStatsResponse}
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 25),
    },
    async (req, reply) => {
      const myId = req.session.profileId

      try {
        const [sent, matches, receivedLikes, newMatchesCount] = await Promise.all([
          service.getLikesSent(myId),
          service.getMatches(myId),
          service.getLikesReceived(myId, 4),
          service.getNewMatchesCount(myId),
        ])
        const response: InteractionStatsResponse = {
          success: true,
          stats: { sent, matches, receivedLikes, newMatchesCount },
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to fetch interactions')
      }
    }
  )

  /**
   * POST /like/:targetId
   * Likes a profile. Creates a new like or returns existing. If mutual, triggers a match.
   * Notifies the target via WebSocket and email.
   * @param {string} targetId - Profile ID to like (CUID)
   * @body {boolean} [isAnonymous=true] - Whether the like is anonymous (hidden from recipient)
   * @returns {InteractionEdgeResponse}
   */
  fastify.post<{ Params: { targetId: string } }>(
    '/like/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', RATE_LIMIT_LIKE_OR_PASS),
    },
    async (req, reply) => {
      const { targetId } = TargetLookupParamsSchema.parse(req.params)
      const myId = req.session.profileId
      const body = z.object({ isAnonymous: z.boolean().default(true) }).parse(req.body ?? {})

      try {
        const { isNewLike, ...likeResult } = await service.like(myId, targetId, body.isAnonymous)
        const response: InteractionEdgeResponse = { success: true, pair: likeResult }
        reply.code(200).send(response)

        if (isNewLike) {
          // Broadcast to the recipient — send the initiator's edge so they see who liked/matched them
          broadcastToProfile(fastify, targetId, {
            type: likeResult.isMatch ? 'ws:new_match' : 'ws:new_like',
            payload: likeResult.from,
          })

          if (likeResult.isMatch) {
            await notifierService.notifyProfile(targetId, 'new_match', {
              name: likeResult.from.profile.publicName,
              link: `${appConfig.FRONTEND_URL}/inbox`,
            })
          } else {
            await notifierService.notifyProfile(targetId, 'new_like', {
              link: `${appConfig.FRONTEND_URL}/browse`,
            })
          }
        }
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to like profile')
      }
    }
  )

  /**
   * PATCH /like/:targetId
   * Updates the anonymity of an existing like (reveal or re-hide).
   * @param {string} targetId - Profile ID of the liked profile (CUID)
   * @body {boolean} isAnonymous - New anonymity state
   * @returns {InteractionEdgeResponse}
   */
  fastify.patch<{ Params: { targetId: string } }>(
    '/like/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const { targetId } = TargetLookupParamsSchema.parse(req.params)
      const myId = req.session.profileId
      const body = z.object({ isAnonymous: z.boolean() }).parse(req.body)

      try {
        const pair = await service.updateLike(myId, targetId, body)
        const response: InteractionEdgeResponse = { success: true, pair }
        reply.code(200).send(response)

        // Broadcast to the recipient — send the initiator's edge so they see the
        // updated anonymity state (reveal or re-hide).
        broadcastToProfile(fastify, targetId, {
          type: 'ws:update_like',
          payload: pair.from,
        })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update like')
      }
    }
  )

  /**
   * POST /pass/:targetId
   * Passes on (hides) a profile so it no longer appears in browse results.
   * @param {string} targetId - Profile ID to pass on (CUID)
   * @returns {{ success: boolean }}
   */
  fastify.post<{ Params: { targetId: string } }>(
    '/pass/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', RATE_LIMIT_LIKE_OR_PASS),
    },
    async (req, reply) => {
      const { targetId } = TargetLookupParamsSchema.parse(req.params)
      const myId = req.session.profileId

      try {
        await service.pass(myId, targetId)
        reply.code(200).send({ success: true })

        // Pass deletes any existing likes in either direction, so the recipient's
        // received-likes list may have changed. Notify them to refetch.
        broadcastToProfile(fastify, targetId, { type: 'ws:update_like' })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to pass profile')
      }
    }
  )

  /**
   * GET /received
   * Returns all likes received by the current profile (anonymous likes show null sender).
   * @returns {ReceivedLikesResponse}
   */
  fastify.get(
    '/received',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const myId = req.session.profileId

      try {
        const edges = await service.getLikesReceived(myId)
        const response: ReceivedLikesResponse = { success: true, edges }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to fetch received likes')
      }
    }
  )

  /**
   * GET /sent
   * Returns all likes sent by the current profile.
   * @returns {InteractionEdgesResponse}
   */
  fastify.get(
    '/sent',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const myId = req.session.profileId

      try {
        const edges = await service.getLikesSent(myId)
        const response: InteractionEdgesResponse = { success: true, edges }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to fetch sent likes')
      }
    }
  )

  /**
   * GET /matches
   * Returns all mutual matches (profiles that liked each other) for the current profile.
   * @returns {InteractionEdgesResponse}
   */
  fastify.get(
    '/matches',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const myId = req.session.profileId

      try {
        const edges = await service.getMatches(myId)
        const response: InteractionEdgesResponse = { success: true, edges }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to fetch matches')
      }
    }
  )
}

export default interactionRoutes
