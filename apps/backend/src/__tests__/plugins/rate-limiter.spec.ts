import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import rateLimiterPlugin from '../../plugins/rate-limiter'
import { rateLimitConfig } from '../../api/helpers'

let fastify: FastifyInstance

beforeEach(async () => {
  fastify = Fastify()
  await fastify.register(rateLimiterPlugin)
  fastify.get('/ping', { config: rateLimitConfig(fastify, '1 minute', 1) }, async () => ({
    ok: true,
  }))
  fastify.get('/boom', async () => {
    throw new Error('kaboom')
  })
  await fastify.ready()
})

afterEach(async () => {
  await fastify.close()
})

describe('rate-limiter plugin', () => {
  it('returns an ApiError-shaped body with HTTP 429 when the limit is exceeded', async () => {
    const first = await fastify.inject({ method: 'GET', url: '/ping' })
    expect(first.statusCode).toBe(200)

    const second = await fastify.inject({ method: 'GET', url: '/ping' })
    expect(second.statusCode).toBe(429)

    const body = second.json()
    expect(body).toEqual({
      success: false,
      message: 'Rate limit exceeded.',
    })
    expect(body).not.toHaveProperty('statusCode')
    expect(body).not.toHaveProperty('error')
  })

  it('delegates non-rate-limit errors to the default Fastify error handler', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'kaboom',
    })
  })
})
