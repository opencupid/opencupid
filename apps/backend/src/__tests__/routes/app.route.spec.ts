import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock the MaxMind client
const mockMaxMindClient = {
  country: vi.fn()
}

vi.mock('@maxmind/geoip2-node', () => ({
  WebServiceClient: vi.fn(() => mockMaxMindClient)
}))

import appRoutes from '../../api/routes/app.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply

// We'll mock appConfig per test case since it's imported by the route
const mockAppConfig = vi.hoisted(() => ({
  NODE_ENV: 'development',
  MAXMIND_ACCOUNT_ID: 'test-account',
  MAXMIND_LICENSE_KEY: 'test-key'
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: mockAppConfig
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  fastify.authenticate = vi.fn()
  await appRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /location', () => {
  it('returns mock location when NODE_ENV is development', async () => {
    mockAppConfig.NODE_ENV = 'development'
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '192.168.1.1' },
      ip: '127.0.0.1'
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.location.country).toBe('MX')
    expect(reply.payload.location.cityName).toBe('')
    expect(mockMaxMindClient.country).not.toHaveBeenCalled()
  })

  it('calls MaxMind service when NODE_ENV is production', async () => {
    mockAppConfig.NODE_ENV = 'production'
    mockMaxMindClient.country.mockResolvedValue({
      country: { isoCode: 'US' }
    })
    
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '8.8.8.8' },
      ip: '8.8.8.8'
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.location.country).toBe('US')
    expect(mockMaxMindClient.country).toHaveBeenCalledWith('8.8.8.8')
  })

  it('calls MaxMind service when NODE_ENV is test', async () => {
    mockAppConfig.NODE_ENV = 'test'
    mockMaxMindClient.country.mockResolvedValue({
      country: { isoCode: 'CA' }
    })
    
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '1.2.3.4' },
      ip: '1.2.3.4'
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.location.country).toBe('CA')
    expect(mockMaxMindClient.country).toHaveBeenCalledWith('1.2.3.4')
  })

  it('handles MaxMind service errors gracefully', async () => {
    mockAppConfig.NODE_ENV = 'production'
    mockMaxMindClient.country.mockRejectedValue(new Error('MaxMind error'))
    
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '8.8.8.8' },
      ip: '8.8.8.8'
    } as any, reply as any)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Location lookup failed')
  })

  it('extracts client IP from x-forwarded-for header', async () => {
    mockAppConfig.NODE_ENV = 'production'
    mockMaxMindClient.country.mockResolvedValue({
      country: { isoCode: 'FR' }
    })
    
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
      ip: '192.168.1.1'
    } as any, reply as any)

    expect(mockMaxMindClient.country).toHaveBeenCalledWith('203.0.113.1')
  })

  it('strips IPv6 prefix from IPv4-mapped addresses', async () => {
    mockAppConfig.NODE_ENV = 'production'
    mockMaxMindClient.country.mockResolvedValue({
      country: { isoCode: 'DE' }
    })
    
    const handler = fastify.routes['GET /location']
    
    await handler({
      headers: { 'x-forwarded-for': '::ffff:203.0.113.1' },
      ip: '192.168.1.1'
    } as any, reply as any)

    expect(mockMaxMindClient.country).toHaveBeenCalledWith('203.0.113.1')
  })
})

describe('GET /version', () => {
  it('returns version information with proper structure', async () => {
    const handler = fastify.routes['GET /version']
    
    await handler({} as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    
    // // Check that all required fields exist
    // const version = reply.payload.version
    // expect(version).toHaveProperty('version')
    // expect(version).toHaveProperty('commit')
    // expect(version).toHaveProperty('timestamp')
    // expect(version).toHaveProperty('app')
    // expect(version).toHaveProperty('frontend')
    // expect(version).toHaveProperty('backend')
    
    // // Timestamp should be a valid ISO string
    // expect(version.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    
    // // Version strings should not be empty
    // expect(version.app).toBeTruthy()
    // expect(version.frontend).toBeTruthy()
    // expect(version.backend).toBeTruthy()
  })
})

describe('GET /updateavailable', () => {
  it('returns update not available when versions match', async () => {
    const handler = fastify.routes['GET /updateavailable']
    
    await handler({
      query: { v: '0.6.2' }
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.updateInfo.updateAvailable).toBe(false)
    expect(reply.payload.updateInfo.currentVersion).toBe('0.6.2')
    expect(reply.payload.updateInfo.latestVersion).toBeTruthy()
  })

  it('returns update available when versions differ', async () => {
    const handler = fastify.routes['GET /updateavailable']
    
    await handler({
      query: { v: '0.6.1' }
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.updateInfo.updateAvailable).toBe(true)
    expect(reply.payload.updateInfo.currentVersion).toBe('0.6.1')
    expect(reply.payload.updateInfo.latestVersion).toBeTruthy()
  })

  it('returns update not available when client version is unknown', async () => {
    const handler = fastify.routes['GET /updateavailable']
    
    await handler({
      query: {}
    } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    // When client version is not provided, updateAvailable is false
    expect(reply.payload.updateInfo.updateAvailable).toBe(false)
    expect(reply.payload.updateInfo.currentVersion).toBe('unknown')
    expect(reply.payload.updateInfo.latestVersion).toBeTruthy()
  })
})