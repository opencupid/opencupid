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

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), null)
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

  it('aborts in-flight request when query is cleared', async () => {
    let aborted = false
    mockSearch.mockImplementationOnce((_q, _l, signal?: AbortSignal) => {
      signal?.addEventListener('abort', () => {
        aborted = true
      })
      return new Promise(() => {}) // never resolves
    })

    const store = useGeocodingStore()
    store.search('Berlin', 'en') // start but don't await
    await store.search('', 'en') // clear — should abort the above

    expect(aborted).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.results).toEqual([])
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

  it('passes a distinct AbortSignal instance to each geocoder call', async () => {
    mockSearch.mockResolvedValue([])

    const store = useGeocodingStore()
    await store.search('Berlin', 'en')
    await store.search('Paris', 'en')

    const firstSignal = mockSearch.mock.calls[0]![2]
    const secondSignal = mockSearch.mock.calls[1]![2]

    expect(firstSignal).toBeInstanceOf(AbortSignal)
    expect(secondSignal).toBeInstanceOf(AbortSignal)
    expect(firstSignal).not.toBe(secondSignal)
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

  it('forwards locationBias coords to the geocoder as bias', async () => {
    mockSearch.mockResolvedValue([])

    const store = useGeocodingStore()
    await store.search('Berlin', 'en', {
      country: 'DE',
      cityName: '',
      lat: 52.52,
      lon: 13.405,
    })

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), {
      lat: 52.52,
      lon: 13.405,
    })
  })

  it('omits bias when locationBias has no coords', async () => {
    mockSearch.mockResolvedValue([])

    const store = useGeocodingStore()
    await store.search('Berlin', 'en', { country: 'DE', cityName: '' })

    expect(mockSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), null)
  })

  it('caps results to the default take of 5', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `City${i}`,
      country: 'DE',
      lat: 0,
      lon: 0,
    }))
    mockSearch.mockResolvedValue(many)

    const store = useGeocodingStore()
    await store.search('city', 'en')

    expect(store.results).toHaveLength(5)
  })

  it('respects an explicit take parameter', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `City${i}`,
      country: 'DE',
      lat: 0,
      lon: 0,
    }))
    mockSearch.mockResolvedValue(many)

    const store = useGeocodingStore()
    await store.search('city', 'en', null, 3)

    expect(store.results).toHaveLength(3)
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
