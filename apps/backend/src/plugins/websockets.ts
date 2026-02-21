import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'

export default fp(async (fastify) => {
  await fastify.register(websocket)

  // Track live WebSocket connections
  fastify.decorate('connections', new Map<string, Set<WebSocket>>())
})
