import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearch = vi.fn()

vi.mock('../../composables/useGeocoder', () => ({
  useGeocoder: () => ({ search: mockSearch }),
}))

import { useGeocodingStore } from '../geocodingStore'

describe('geocodingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSearch.mockReset()
  })

  it('returns results from the geocoder', async () => {
    const mockResults = [{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }]
    mockSearch.mockResolvedValue(mockResults)

    const store = useGeocodingStore()
    const results = await store.search('Berlin', 'en')

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en')
    expect(results).toEqual(mockResults)
    expect(store.results).toEqual(mockResults)
  })

  it('sets isLoading during search', async () => {
    let resolveSearch: (v: unknown[]) => void
    mockSearch.mockReturnValue(
      new Promise((r) => {
        resolveSearch = r
      })
    )

    const store = useGeocodingStore()
    const searchPromise = store.search('Berlin', 'en')

    expect(store.isLoading).toBe(true)

    resolveSearch!([])
    await searchPromise

    expect(store.isLoading).toBe(false)
  })

  it('returns empty results for empty query without calling geocoder', async () => {
    const store = useGeocodingStore()
    const results = await store.search('', 'en')

    expect(results).toEqual([])
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('catches errors and returns empty results', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useGeocodingStore()
    const results = await store.search('Berlin', 'en')

    expect(results).toEqual([])
    expect(store.results).toEqual([])
    expect(store.isLoading).toBe(false)
    consoleSpy.mockRestore()
  })
})
