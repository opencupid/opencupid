import fp from 'fastify-plugin'
import ratelimit from '@fastify/rate-limit'

export class RateLimitError extends Error {
  statusCode: number
  code?: string
  constructor(statusCode: number, code?: string, message = 'Rate limit exceeded.') {
    super(message)
    this.name = 'RateLimitError'
    this.statusCode = statusCode
    this.code = code
  }
}

export default fp(async (fastify) => {
  await fastify.register(ratelimit, {
    global: false,
    keyGenerator: (req) => {
      return req.user?.userId || req.ip // fallback to IP if unauthenticated
    },
    errorResponseBuilder: (_req, context) => new RateLimitError(context.statusCode),
  })

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof RateLimitError) {
      return reply.code(err.statusCode).send({
        success: false,
        message: err.message,
        ...(err.code && { code: err.code }),
      })
    }
    reply.send(err)
  })
})
