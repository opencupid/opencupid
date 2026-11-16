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
const refresh = vi.fn(async () => ({ ok: true }))
const adminKpis = vi.fn(async () => ({ ok: true }))

beforeEach(async () => {
  refresh.mockClear()
  adminKpis.mockClear()
  fastify = Fastify()
  // Mirrors the app: the plugin is registered inside the auth routes' scope.
  await fastify.register(
    async (auth) => {
      await auth.register(brandHostPlugin)
      auth.post('/refresh', refresh)
    },
    { prefix: '/api/auth' }
  )
  fastify.get('/api/admin/kpis', adminKpis)
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
    expect(refresh).toHaveBeenCalled()
  })

  it('rejects a host no brand serves with 421 before the handler runs', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { host: 'nowhere.test' },
    })
    expect(res.statusCode).toBe(421)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('leaves routes outside its scope reachable by an internal hostname', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/admin/kpis',
      headers: { host: 'backend:3000' },
    })
    expect(res.statusCode).toBe(200)
    expect(adminKpis).toHaveBeenCalled()
  })
})
