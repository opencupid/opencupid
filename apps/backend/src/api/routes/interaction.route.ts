import { FastifyPluginAsync } from 'fastify'
import z from 'zod'
import { rateLimitConfig, sendError } from '../helpers'
import type {
  InteractionEdgeResponse,
  InteractionEdgesResponse,
  InteractionStatsResponse,
  ReceivedLikesResponse,
} from '@zod/apiResponse.dto'
import { InteractionService } from '@/services/interaction.service'
import { broadcastToProfile } from '@/utils/wsUtils'
import { notifierService } from '@/services/notifier.service'
import { appConfig } from '@/lib/appconfig'

// Route params for ID lookups
const TargetLookupParamsSchema = z.object({
  targetId: z.string().cuid(),
})

const interactionRoutes: FastifyPluginAsync = async (fastify) => {
  const service = InteractionService.getInstance()

  // GET /interactions
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
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

  // POST /interactions/like/:targetId
  fastify.post<{ Params: { targetId: string } }>(
    '/like/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '5 minute', 15),
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
          // Broadcast the new message to the recipient
          broadcastToProfile(fastify, targetId, {
            type: likeResult.isMatch ? 'ws:new_match' : 'ws:new_like',
            payload: likeResult.to,
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

  // PATCH /interactions/like/:targetId
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
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update like')
      }
    }
  )

  // POST /interactions/pass/:targetId
  fastify.post<{ Params: { targetId: string } }>(
    '/pass/:targetId',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 3),
    },
    async (req, reply) => {
      const { targetId } = TargetLookupParamsSchema.parse(req.params)
      const myId = req.session.profileId

      try {
        await service.pass(myId, targetId)
        return reply.code(200).send({ success: true })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to pass profile')
      }
    }
  )

  // GET /interactions/received
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

  // GET /interactions/sent
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

  // GET /interactions/matches
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
