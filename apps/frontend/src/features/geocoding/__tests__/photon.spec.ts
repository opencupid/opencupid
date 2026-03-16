import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchPhoton } from '../providers/photon'

describe('searchPhoton', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls the Photon API with correct URL and params', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Berlin', 'en')

    expect(mockGet).toHaveBeenCalledOnce()
    const [url, config] = mockGet.mock.calls[0]!
    expect(url).toBe('https://photon.komoot.io/api/')

    const params: URLSearchParams = config.params
    expect(params.get('q')).toBe('Berlin')
    expect(params.get('lang')).toBe('en')
    expect(params.get('limit')).toBe('10')
    expect(params.getAll('osm_tag')).toEqual([
      'place:city',
      'place:town',
      'place:village',
      'place:hamlet',
    ])
    expect(params.getAll('layer')).toEqual(['city', 'locality'])
  })

  it('passes through de lang (Photon supports en/de)', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Berlin', 'de')

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.get('lang')).toBe('de')
  })

  it('defaults unsupported languages to en', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Paris', 'fr')

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.get('lang')).toBe('en')
  })

  it('maps GeoJSON features to GeocodingResult[]', async () => {
    mockGet.mockResolvedValue({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [13.4, 52.5] },
            properties: { name: 'Berlin', countrycode: 'DE' },
          },
        ],
      },
    })

    const results = await searchPhoton('Berlin', 'en')

    expect(results).toEqual([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])
  })

  it('returns empty array when no features', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    const results = await searchPhoton('nonexistent', 'en')

    expect(results).toEqual([])
  })

  it('propagates errors (does not catch)', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(searchPhoton('Berlin', 'en')).rejects.toThrow('Network error')
  })
})
