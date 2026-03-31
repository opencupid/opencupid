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
    if (!req.session?.profileId) return

    try {
      await recordActivity(req.session.profileId)
    } catch (err) {
      req.log.warn({ err }, 'activity tracking failed')
    }
  })
})
