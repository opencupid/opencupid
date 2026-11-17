import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/appconfig', () => ({ appConfig: { GEOIP_API_URL: 'http://geoip:8080' } }))

import { lookupNetwork } from '../../lib/geoip'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupNetwork', () => {
  it('returns country and network owner from geoip-api', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        country: 'US',
        city: 'Charleston',
        asn: 15169,
        asnOrganization: 'Google LLC',
        asnNetwork: '172.253.0.0/20',
      }),
    })

    await expect(lookupNetwork('172.253.7.112')).resolves.toEqual({
      country: 'US',
      asn: 15169,
      asnOrganization: 'Google LLC',
    })
    expect(fetchMock.mock.calls[0][0]).toBe('http://geoip:8080/172.253.7.112')
  })

  it('returns null on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 })
    await expect(lookupNetwork('10.0.0.1')).resolves.toBeNull()
  })

  it('returns null when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(lookupNetwork('10.0.0.1')).resolves.toBeNull()
  })

  it('returns null on an unexpected response shape', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ asn: 'not-a-number' }) })
    await expect(lookupNetwork('10.0.0.1')).resolves.toBeNull()
  })
})
