import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { searchNominatim } from '../providers/nominatim'

describe('searchNominatim', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls the Nominatim API with correct URL and params', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchNominatim('Berlin', 'de')

    expect(mockGet).toHaveBeenCalledOnce()
    const [url, config] = mockGet.mock.calls[0]!
    expect(url).toBe('https://nominatim.openstreetmap.org/search')

    const params: URLSearchParams = config.params
    expect(params.get('q')).toBe('Berlin')
    expect(params.get('format')).toBe('geojson')
    expect(params.get('addressdetails')).toBe('1')
    expect(params.get('limit')).toBe('10')
    expect(params.get('featureType')).toBe('city')
    expect(params.get('accept-language')).toBe('de')
  })

  it('sets User-Agent header per Nominatim usage policy', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    await searchNominatim('Berlin', 'en')

    const config = mockGet.mock.calls[0]![1]
    expect(config.headers['User-Agent']).toBe('OpenCupid/1.0')
  })

  it('maps GeoJSON features to GeocodingResult[] with uppercase country', async () => {
    mockGet.mockResolvedValue({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [13.3951, 52.5174] },
            properties: {
              name: 'Berlin',
              display_name: 'Berlin, Deutschland',
              address: { country_code: 'de', country: 'Deutschland', city: 'Berlin' },
            },
          },
        ],
      },
    })

    const results = await searchNominatim('Berlin', 'en')

    expect(results).toEqual([{ name: 'Berlin', country: 'DE', lat: 52.5174, lon: 13.3951 }])
  })

  it('returns empty array when no features', async () => {
    mockGet.mockResolvedValue({ data: { type: 'FeatureCollection', features: [] } })

    const results = await searchNominatim('nonexistent', 'en')

    expect(results).toEqual([])
  })

  it('propagates errors (does not catch)', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(searchNominatim('Berlin', 'en')).rejects.toThrow('Network error')
  })
})
