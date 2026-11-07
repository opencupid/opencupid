import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    BRANDS: [
      {
        domain: 'gaians.test',
        siteName: 'Gaians',
        frontendUrl: 'https://gaians.test',
        emailFrom: 'hello@gaians.test',
      },
    ],
  },
}))

import brandHostPlugin from '../../plugins/brand-host'

let fastify: FastifyInstance
const handler = vi.fn(async () => ({ ok: true }))

beforeEach(async () => {
  handler.mockClear()
  fastify = Fastify()
  await fastify.register(brandHostPlugin)
  fastify.post('/api/auth/refresh', handler)
  await fastify.ready()
})

afterEach(async () => {
  await fastify.close()
})

describe('brand-host plugin', () => {
  it('lets requests to a brand host through', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { host: 'www.gaians.test' },
    })
    expect(res.statusCode).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  it('rejects a host no brand serves with 421 before the handler runs', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { host: 'nowhere.test' },
    })
    expect(res.statusCode).toBe(421)
    expect(handler).not.toHaveBeenCalled()
  })
})
