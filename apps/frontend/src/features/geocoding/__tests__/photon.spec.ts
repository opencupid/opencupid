import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchPhoton, reversePhoton } from '../providers/photon'

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

  it('omits bias params when no bias is supplied', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('Berlin', 'en')

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.has('lat')).toBe(false)
    expect(params.has('lon')).toBe(false)
    expect(params.has('zoom')).toBe(false)
    expect(params.has('location_bias_scale')).toBe(false)
  })

  it('forwards bias coords and tuning params when bias is supplied', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchPhoton('als', 'en', undefined, { lat: 46.679423, lon: 18.5389986 })

    const params: URLSearchParams = mockGet.mock.calls[0]![1].params
    expect(params.get('lat')).toBe('46.679423')
    expect(params.get('lon')).toBe('18.5389986')
    expect(params.get('zoom')).toBe('8')
    expect(params.get('location_bias_scale')).toBe('0.0')
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

describe('searchPhoton extent', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('maps the Photon extent to bounds', async () => {
    mockGet.mockResolvedValue({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [19.04, 47.5] },
            properties: {
              name: 'Budapest',
              countrycode: 'HU',
              extent: [18.93, 47.61, 19.33, 47.35],
            },
          },
        ],
      },
    })

    const [result] = await searchPhoton('Budapest', 'en')

    expect(result!.bounds).toEqual({ west: 18.93, north: 47.61, east: 19.33, south: 47.35 })
  })
})

describe('reversePhoton', () => {
  const szentendre = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [19.076, 47.668] },
    properties: {
      name: 'Szentendre',
      countrycode: 'HU',
      extent: [18.975, 47.729, 19.091, 47.626],
    },
  }

  beforeEach(() => {
    mockGet.mockReset()
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = ''
  })

  afterEach(() => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = ''
  })

  it('looks up the nearest settlement around the point', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [szentendre] } })
    const signal = new AbortController().signal

    const result = await reversePhoton({ lat: 47.669, lon: 19.075 }, 'de', signal)

    const [url, config] = mockGet.mock.calls[0]!
    expect(url).toBe('https://photon.komoot.io/reverse')
    const params: URLSearchParams = config.params
    expect(params.get('lat')).toBe('47.669')
    expect(params.get('lon')).toBe('19.075')
    expect(params.get('lang')).toBe('de')
    expect(params.get('radius')).toBe('15')
    expect(params.get('limit')).toBe('1')
    expect(params.getAll('osm_tag')).toEqual([
      'place:city',
      'place:town',
      'place:village',
      'place:hamlet',
    ])
    expect(params.getAll('layer')).toEqual(['city', 'locality'])
    expect(config.signal).toBe(signal)
    expect(result).toEqual({
      name: 'Szentendre',
      country: 'HU',
      lat: 47.668,
      lon: 19.076,
      bounds: { west: 18.975, north: 47.729, east: 19.091, south: 47.626 },
    })
  })

  it('returns null when nothing is found', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await expect(reversePhoton({ lat: 0, lon: 0 }, 'en')).resolves.toBeNull()
  })

  it('returns null when the match is outside the allowed countries', async () => {
    ;(globalThis as any).__APP_CONFIG__.GEOCODING_ALLOWED_COUNTRIES = 'DE,AT'
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [szentendre] } })

    await expect(reversePhoton({ lat: 47.669, lon: 19.075 }, 'en')).resolves.toBeNull()
  })
})
