import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { brandForHost } from '@/lib/brand'

/**
 * Rejects a request whose host no brand serves (421) before any handler runs,
 * so a handler never consumes a login or refresh token and only then fails to
 * set the cookie that carries its replacement.
 */
export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (req) => {
    brandForHost(req.hostname)
  })
})
