import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchPhoton } from '../providers/photon'

const multiCityFeatures = [
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [13.4, 52.5] },
    properties: { name: 'Berlin', countrycode: 'DE' },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [121.0, 14.6] },
    properties: { name: 'Manila', countrycode: 'PH' },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-73.9, 40.7] },
    properties: { name: 'New York', countrycode: 'US' },
  },
]

describe('searchPhoton', () => {
  beforeEach(() => {
    mockGet.mockReset()
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = ''
  })

  afterEach(() => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = ''
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
    expect(params.get('limit')).toBe('50')
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

  it('forwards AbortSignal to axios', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })
    const controller = new AbortController()

    await searchPhoton('Berlin', 'en', controller.signal)

    const [, config] = mockGet.mock.calls[0]!
    expect(config.signal).toBe(controller.signal)
  })

  it('propagates errors (does not catch)', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(searchPhoton('Berlin', 'en')).rejects.toThrow('Network error')
  })

  it('treats whitespace-only GEOCODING_ALLOWED_COUNTRIES as unset (returns all results)', async () => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = '   '
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: multiCityFeatures } })

    const results = await searchPhoton('city', 'en')

    expect(results.map((r) => r.name)).toEqual(['Berlin', 'Manila', 'New York'])
  })

  it('returns all results when GEOCODING_ALLOWED_COUNTRIES is empty', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: multiCityFeatures } })

    const results = await searchPhoton('city', 'en')

    expect(results.map((r) => r.name)).toEqual(['Berlin', 'Manila', 'New York'])
  })

  it('filters results to allowed countries', async () => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = 'DE,PH'
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: multiCityFeatures } })

    const results = await searchPhoton('city', 'en')

    expect(results.map((r) => r.name)).toEqual(['Berlin', 'Manila'])
  })

  it('filters case-insensitively (lowercase env input)', async () => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = 'de,ph'
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: multiCityFeatures } })

    const results = await searchPhoton('city', 'en')

    expect(results.map((r) => r.name)).toEqual(['Berlin', 'Manila'])
  })

  it('returns empty when no results match the allowed countries', async () => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = 'JP'
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: multiCityFeatures } })

    const results = await searchPhoton('city', 'en')

    expect(results).toEqual([])
  })
})
