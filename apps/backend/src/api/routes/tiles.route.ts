import { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import tilesProxy from '@/plugins/tiles-proxy'

const tilesRoutes: FastifyPluginAsync = async fastify => {
  // Register rate limiting for tiles proxy
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 second', // Allow more requests for tile loading (be polite to OSM)
  })

  // Register the tiles proxy plugin
  await fastify.register(tilesProxy)
}

export default tilesRoutes
