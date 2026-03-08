import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  axios: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { useKomootStore } from '../komootStore'

describe('komootStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  it('includes layer=city and layer=locality params in the API request', async () => {
    mockGet.mockResolvedValue({ data: { features: [] } })

    const store = useKomootStore()
    await store.search('Berlin', 'en')

    expect(mockGet).toHaveBeenCalledOnce()
    const [url, config] = mockGet.mock.calls[0]
    expect(url).toBe('https://photon.komoot.io/api/')

    const params: URLSearchParams = config.params
    expect(params.getAll('layer')).toEqual(['city', 'locality'])
  })

  it('includes osm_tag filters alongside layer params', async () => {
    mockGet.mockResolvedValue({ data: { features: [] } })

    const store = useKomootStore()
    await store.search('Berlin', 'en')

    const params: URLSearchParams = mockGet.mock.calls[0][1].params
    const osmTags = params.getAll('osm_tag')
    expect(osmTags).toContain('place:city')
    expect(osmTags).toContain('place:town')
    expect(osmTags).toContain('place:village')
    expect(osmTags).toContain('place:hamlet')
  })

  it('maps response features to KomootLocation objects', async () => {
    mockGet.mockResolvedValue({
      data: {
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [13.4, 52.5] },
            properties: { name: 'Berlin', countrycode: 'DE' },
          },
        ],
      },
    })

    const store = useKomootStore()
    const results = await store.search('Berlin', 'en')

    expect(results).toEqual([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])
  })

  it('returns empty results for empty query without making API call', async () => {
    const store = useKomootStore()
    const results = await store.search('', 'en')

    expect(results).toEqual([])
    expect(mockGet).not.toHaveBeenCalled()
  })
})
