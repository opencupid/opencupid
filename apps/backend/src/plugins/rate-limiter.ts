import fp from 'fastify-plugin'
import ratelimit from '@fastify/rate-limit'

export default fp(async (fastify) => {
  await fastify.register(ratelimit, {
    global: false,
    keyGenerator: (req) => {
      return req.user?.userId || req.ip // fallback to IP if unauthenticated
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded.`,
      }
    },
  })
})
