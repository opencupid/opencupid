import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearch = vi.hoisted(() => vi.fn())

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

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal))
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

  it('passes an AbortSignal to the geocoder', async () => {
    mockSearch.mockResolvedValue([])

    const store = useGeocodingStore()
    await store.search('Berlin', 'en')

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal))
  })

  it('aborts previous in-flight request when a new search is issued', async () => {
    let firstAborted = false
    let resolveFirst!: (v: never[]) => void

    mockSearch.mockImplementationOnce((_query, _lang, signal?: AbortSignal) => {
      signal?.addEventListener('abort', () => {
        firstAborted = true
      })
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    })
    mockSearch.mockResolvedValueOnce([{ name: 'San Juan', country: 'PH', lat: 18.5, lon: -66.1 }])

    const store = useGeocodingStore()
    const first = store.search('san', 'en')
    const second = store.search('san juan', 'en')

    resolveFirst([])
    await Promise.allSettled([first, second])

    expect(firstAborted).toBe(true)
    expect(store.results).toEqual([{ name: 'San Juan', country: 'PH', lat: 18.5, lon: -66.1 }])
  })

  it('sorts exact matches (case-insensitive) to the top', async () => {
    const unsorted = [
      { name: 'San Juan de la Nava', country: 'ES', lat: 40.4, lon: -4.8 },
      { name: 'San Juan', country: 'PH', lat: 18.5, lon: -66.1 },
      { name: 'San Juan Bautista', country: 'ES', lat: 39.6, lon: 2.9 },
    ]
    mockSearch.mockResolvedValue(unsorted)

    const store = useGeocodingStore()
    await store.search('san juan', 'en')

    expect(store.results[0]!.name).toBe('San Juan')
    expect(store.results.slice(1).map((r) => r.name)).toContain('San Juan de la Nava')
    expect(store.results.slice(1).map((r) => r.name)).toContain('San Juan Bautista')
  })

  it('does not treat a CanceledError as a real failure', async () => {
    const canceledError = Object.assign(new Error('canceled'), { name: 'CanceledError' })
    mockSearch.mockRejectedValue(canceledError)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useGeocodingStore()
    const results = await store.search('Berlin', 'en')

    expect(consoleSpy).not.toHaveBeenCalled()
    expect(results).toEqual([])
    consoleSpy.mockRestore()
  })
})
