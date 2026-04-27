import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import appRoutes from '../../api/routes/app.route'
import { appConfig } from '../../lib/appconfig'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let originalGeoipUrl: string

const mockFetch = vi.fn()

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  fastify.authenticate = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
  originalGeoipUrl = appConfig.GEOIP_API_URL
  appConfig.GEOIP_API_URL = 'http://geoip-api:8080'
  await appRoutes(fastify as any, {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  appConfig.GEOIP_API_URL = originalGeoipUrl
})

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  }
}

describe('GET /location', () => {
  it('queries geoip-api with the client IP and returns the country', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ country: 'US' }))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '8.8.8.8',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.location.country).toBe('US')
    expect(mockFetch).toHaveBeenCalledWith('http://geoip-api:8080/8.8.8.8')
  })

  it('returns a location with undefined country when geoip-api omits it (e.g. private IP)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: {},
        ip: '127.0.0.1',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.location.country).toBeUndefined()
  })

  it('returns 500 when geoip-api responds with a non-JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    })

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: {},
        ip: '127.0.0.1',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Location lookup failed')
  })

  it('returns 502 when upstream returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 502 }))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '8.8.8.8',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(502)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Geolocation upstream error')
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '8.8.8.8',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Location lookup failed')
  })

  it('returns 502 when upstream response fails zod validation', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ country: 'NOT_AN_ISO_CODE' }))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '8.8.8.8' },
        ip: '8.8.8.8',
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(502)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Geolocation upstream returned malformed data')
  })

  it('extracts client IP from x-forwarded-for header', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ country: 'FR' }))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
        ip: '192.168.1.1',
      } as any,
      reply as any
    )

    expect(mockFetch).toHaveBeenCalledWith('http://geoip-api:8080/203.0.113.1')
  })

  it('strips IPv6 prefix from IPv4-mapped addresses', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ country: 'DE' }))

    const handler = fastify.routes['GET /location']
    await handler(
      {
        headers: { 'x-forwarded-for': '::ffff:203.0.113.1' },
        ip: '192.168.1.1',
      } as any,
      reply as any
    )

    expect(mockFetch).toHaveBeenCalledWith('http://geoip-api:8080/203.0.113.1')
  })
})

describe('GET /version', () => {
  it('returns version info without update when no client version provided', async () => {
    const handler = fastify.routes['GET /version']

    await handler(
      {
        query: {},
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.version.frontendVersion).toBe(__FRONTEND_VERSION__)
    expect(reply.payload.version.backendVersion).toBe(__APP_VERSION__)
    expect(reply.payload.version.updateAvailable).toBe(false)
    expect(reply.payload.version.currentVersion).toBeUndefined()
  })

  it('returns update not available when versions match', async () => {
    const handler = fastify.routes['GET /version']

    await handler(
      {
        query: { v: __FRONTEND_VERSION__ },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.version.updateAvailable).toBe(false)
    expect(reply.payload.version.currentVersion).toBe(__FRONTEND_VERSION__)
    expect(reply.payload.version.frontendVersion).toBe(__FRONTEND_VERSION__)
  })

  it('returns update available when versions differ', async () => {
    const handler = fastify.routes['GET /version']

    await handler(
      {
        query: { v: '0.1.0' },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.version.updateAvailable).toBe(true)
    expect(reply.payload.version.currentVersion).toBe('0.1.0')
    expect(reply.payload.version.frontendVersion).toBe(__FRONTEND_VERSION__)
  })

  it('returns update not available when client version is "unknown"', async () => {
    const handler = fastify.routes['GET /version']

    await handler(
      {
        query: { v: 'unknown' },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.version.updateAvailable).toBe(false)
    expect(reply.payload.version.currentVersion).toBe('unknown')
  })
})
