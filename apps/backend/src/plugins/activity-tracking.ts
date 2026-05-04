import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { recordActivity } from '@/services/activity.service'

/**
 * Records authenticated profile activity from the `onResponse` hook (after
 * the response is sent, so it never delays the request). Dedup is handled
 * inside `recordActivity` via a Redis NX lock with TTL = the session gap.
 */
export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onResponse', async (req) => {
    if (!req.session?.profileId) return

    try {
      await recordActivity(fastify.redis, req.session.profileId)
    } catch (err) {
      req.log.warn({ err }, 'activity tracking failed')
    }
  })
})
