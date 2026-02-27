import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { recordActivity } from '@/services/activity.service'

/**
 * Piggybacks on the authenticate hook to record user sessions.
 * Runs after successful auth — fires-and-forgets the recording so it
 * never blocks or fails the original request.
 */
export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onResponse', async (req) => {
    // Only track authenticated requests (session is set by the authenticate hook)
    if (!req.session?.profileId) return

    try {
      await recordActivity(fastify.redis, req.session.profileId)
    } catch (err) {
      // Never fail the request because of activity tracking
      req.log.warn({ err }, 'activity tracking failed')
    }
  })
})
