import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { recordActivity } from '@/services/activity.service'

/**
 * Piggybacks on the authenticate hook to record user sessions.
 * Runs in the onResponse hook (after the response is sent to the client)
 * so it never delays the original request. Errors are caught and logged.
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
