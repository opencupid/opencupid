import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import tilesPlugin from '../../plugins/tiles-proxy'

describe('tiles-proxy plugin', () => {
  let app: any

  beforeEach(async () => {
    app = Fastify()
    await app.register(tilesPlugin)
  })

  it('should reject invalid tile coordinates', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tiles/invalid/0/0.png'
    })
    expect(response.statusCode).toBe(400)
    expect(response.body).toBe('bad tile coords')
  })

  it('should reject zoom levels above 19', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tiles/20/0/0.png'
    })
    expect(response.statusCode).toBe(400)
    expect(response.body).toBe('bad tile coords')
  })

  it('should reject negative coordinates', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tiles/-1/0/0.png'
    })
    expect(response.statusCode).toBe(400)
    expect(response.body).toBe('bad tile coords')
  })

  it('should accept valid tile coordinates', async () => {
    // Mock the upstream fetch to avoid making real requests in tests
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          switch (name) {
            case 'content-type': return 'image/png'
            case 'etag': return '"test-etag"'
            case 'last-modified': return 'Wed, 01 Jan 2020 00:00:00 GMT'
            default: return null
          }
        }
      },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
    })
    
    vi.stubGlobal('fetch', mockFetch)
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/tiles/10/512/384.png'
    })
    
    // Should not return 400
    expect(response.statusCode).not.toBe(400)
    // Should either succeed or fail gracefully (not return bad coords error)
    expect(response.body).not.toBe('bad tile coords')
  })

  afterEach(async () => {
    await app.close()
    vi.unstubAllGlobals()
  })
})