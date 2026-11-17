import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockLookupNetwork = vi.fn()
const mockSendUmamiEvent = vi.fn()
vi.mock('@/lib/geoip', () => ({ lookupNetwork: (ip: string) => mockLookupNetwork(ip) }))
vi.mock('@/lib/umami', () => ({
  sendUmamiEvent: (...args: unknown[]) => mockSendUmamiEvent(...args),
}))

import { trackMagicLinkVerify } from '../../services/magicLinkTelemetry.service'

const brand = {
  domain: 'example.org',
  siteName: 'Example',
  frontendUrl: 'https://example.org',
  emailFrom: 'hi@example.org',
  fallbackLocale: 'en',
  umami: { url: 'https://u.example.org', websiteId: 'site-1' },
}

const user = { ip: '81.0.0.1', userAgent: 'Mozilla/5.0 (iPhone) Safari' }
const scanner = { ip: '172.253.7.112', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/155' }

const NETWORKS: Record<string, unknown> = {
  [user.ip]: { country: 'HU', asn: 5483, asnOrganization: 'Magyar Telekom' },
  [scanner.ip]: { country: 'US', asn: 15169, asnOrganization: 'Google LLC' },
}

function makeRedis() {
  const store = new Map<string, string>()
  return {
    store,
    set: vi.fn(async (k: string, v: string, ..._opts: unknown[]) => {
      store.set(k, v)
      return 'OK'
    }),
    get: vi.fn(async (k: string) => store.get(k) ?? null),
  }
}

function sentData() {
  const calls = mockSendUmamiEvent.mock.calls
  return calls[calls.length - 1][1].data
}

let redis: ReturnType<typeof makeRedis>

beforeEach(() => {
  vi.clearAllMocks()
  redis = makeRedis()
  mockLookupNetwork.mockImplementation(async (ip: string) => NETWORKS[ip] ?? null)
  mockSendUmamiEvent.mockResolvedValue(undefined)
})

describe('trackMagicLinkVerify', () => {
  it('does nothing when the brand has no Umami site', async () => {
    const { umami: _, ...noUmami } = brand
    await trackMagicLinkVerify(redis as any, noUmami, {
      token: 'ABC123',
      outcome: 'consumed',
      client: user,
    })
    expect(redis.set).not.toHaveBeenCalled()
    expect(mockSendUmamiEvent).not.toHaveBeenCalled()
  })

  it('remembers a consumed token (hashed, 24h) and reports the consumer', async () => {
    const issued = new Date(Date.now() - 90_000)
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'consumed',
      client: scanner,
      tokenIssuedAt: issued,
    })

    const [key, , ex, ttl] = redis.set.mock.calls[0]
    expect(key).toMatch(/^magic-link:used:[0-9a-f]{64}$/)
    expect(key).not.toContain('ABC123')
    expect([ex, ttl]).toEqual(['EX', 86400])

    expect(mockSendUmamiEvent).toHaveBeenCalledWith(brand, {
      name: 'magic-link-verify',
      url: '/magic-link',
      ip: scanner.ip,
      data: expect.objectContaining({
        outcome: 'consumed',
        clientNetwork: 'Google LLC',
        clientAsn: 15169,
        clientCountry: 'US',
        clientUa: scanner.userAgent,
        secondsSinceIssued: 90,
      }),
    })
  })

  it('reports a miss on a used token as already_used, naming who used it', async () => {
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'consumed',
      client: scanner,
    })
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'invalid',
      client: user,
    })

    expect(sentData()).toEqual(
      expect.objectContaining({
        outcome: 'already_used',
        clientNetwork: 'Magyar Telekom',
        consumerNetwork: 'Google LLC',
        consumerCountry: 'US',
        consumerUa: scanner.userAgent,
        sameIp: false,
        sameUa: false,
        secondsSinceConsumed: expect.any(Number),
      })
    )
  })

  it('flags the same client presenting its own used token (reload, double click)', async () => {
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'consumed',
      client: user,
    })
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'invalid',
      client: user,
    })

    expect(sentData()).toEqual(expect.objectContaining({ sameIp: true, sameUa: true }))
  })

  it('reports a miss on a never-used token as unknown_token', async () => {
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ZZZ999',
      outcome: 'invalid',
      client: user,
    })

    const data = sentData()
    expect(data.outcome).toBe('unknown_token')
    expect(data).not.toHaveProperty('consumerNetwork')
  })

  it('reports expired tokens without a Redis lookup', async () => {
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'expired',
      client: user,
    })

    expect(redis.get).not.toHaveBeenCalled()
    expect(sentData().outcome).toBe('expired')
  })

  it('reports an unknown network when the geoip lookup fails', async () => {
    mockLookupNetwork.mockResolvedValue(null)
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'expired',
      client: user,
    })

    expect(sentData()).toEqual(
      expect.objectContaining({ clientNetwork: 'unknown', clientAsn: 0, clientCountry: 'unknown' })
    )
  })

  it('truncates long user agents', async () => {
    await trackMagicLinkVerify(redis as any, brand, {
      token: 'ABC123',
      outcome: 'expired',
      client: { ip: user.ip, userAgent: 'x'.repeat(1000) },
    })

    expect(sentData().clientUa).toHaveLength(250)
  })

  it('never throws, even when Redis fails', async () => {
    redis.set.mockRejectedValueOnce(new Error('redis down'))
    await expect(
      trackMagicLinkVerify(redis as any, brand, {
        token: 'ABC123',
        outcome: 'consumed',
        client: user,
      })
    ).resolves.toBeUndefined()
  })
})
