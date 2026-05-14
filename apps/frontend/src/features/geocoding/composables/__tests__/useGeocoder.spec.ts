import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProviderSearch = vi.hoisted(() => vi.fn())
const mockCaptureMessage = vi.hoisted(() => vi.fn())

vi.mock('../../providers/photon', () => ({
  searchPhoton: mockProviderSearch,
}))

vi.mock('@sentry/vue', () => ({
  captureMessage: mockCaptureMessage,
}))

import { useGeocoder } from '../useGeocoder'

describe('useGeocoder', () => {
  beforeEach(() => {
    mockProviderSearch.mockReset()
    mockCaptureMessage.mockReset()
  })

  it('returns results from the geocoder', async () => {
    const mockResults = [{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }]
    mockProviderSearch.mockResolvedValue(mockResults)

    const geocoder = useGeocoder()
    const results = await geocoder.search('Berlin', 'en')

    expect(mockProviderSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), null)
    expect(results).toEqual(mockResults)
    expect(geocoder.results.value).toEqual(mockResults)
  })

  it('sets isLoading during search', async () => {
    let resolveSearch: (v: unknown[]) => void
    mockProviderSearch.mockReturnValue(
      new Promise((r) => {
        resolveSearch = r
      })
    )

    const geocoder = useGeocoder()
    const searchPromise = geocoder.search('Berlin', 'en')

    expect(geocoder.isLoading.value).toBe(true)

    resolveSearch!([])
    await searchPromise

    expect(geocoder.isLoading.value).toBe(false)
  })

  it('returns empty results for empty query without calling provider', async () => {
    const geocoder = useGeocoder()
    const results = await geocoder.search('', 'en')

    expect(results).toEqual([])
    expect(mockProviderSearch).not.toHaveBeenCalled()
  })

  it('aborts in-flight request when query is cleared', async () => {
    let aborted = false
    mockProviderSearch.mockImplementationOnce((_q, _l, signal?: AbortSignal) => {
      signal?.addEventListener('abort', () => {
        aborted = true
      })
      return new Promise(() => {}) // never resolves
    })

    const geocoder = useGeocoder()
    geocoder.search('Berlin', 'en') // start but don't await
    await geocoder.search('', 'en') // clear — should abort the above

    expect(aborted).toBe(true)
    expect(geocoder.isLoading.value).toBe(false)
    expect(geocoder.results.value).toEqual([])
  })

  it('catches errors and returns empty results', async () => {
    mockProviderSearch.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const geocoder = useGeocoder()
    const results = await geocoder.search('Berlin', 'en')

    expect(results).toEqual([])
    expect(geocoder.results.value).toEqual([])
    expect(geocoder.isLoading.value).toBe(false)
    consoleSpy.mockRestore()
  })

  it('passes a distinct AbortSignal instance to each provider call', async () => {
    mockProviderSearch.mockResolvedValue([])

    const geocoder = useGeocoder()
    await geocoder.search('Berlin', 'en')
    await geocoder.search('Paris', 'en')

    const firstSignal = mockProviderSearch.mock.calls[0]![2]
    const secondSignal = mockProviderSearch.mock.calls[1]![2]

    expect(firstSignal).toBeInstanceOf(AbortSignal)
    expect(secondSignal).toBeInstanceOf(AbortSignal)
    expect(firstSignal).not.toBe(secondSignal)
  })

  it('aborts previous in-flight request when a new search is issued', async () => {
    let firstAborted = false
    let resolveFirst!: (v: never[]) => void

    mockProviderSearch.mockImplementationOnce((_query, _lang, signal?: AbortSignal) => {
      signal?.addEventListener('abort', () => {
        firstAborted = true
      })
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    })
    mockProviderSearch.mockResolvedValueOnce([
      { name: 'San Juan', country: 'PH', lat: 18.5, lon: -66.1 },
    ])

    const geocoder = useGeocoder()
    const first = geocoder.search('san', 'en')
    const second = geocoder.search('san juan', 'en')

    resolveFirst([])
    await Promise.allSettled([first, second])

    expect(firstAborted).toBe(true)
    expect(geocoder.results.value).toEqual([
      { name: 'San Juan', country: 'PH', lat: 18.5, lon: -66.1 },
    ])
  })

  it('forwards locationBias coords to the provider as bias', async () => {
    mockProviderSearch.mockResolvedValue([])

    const geocoder = useGeocoder()
    await geocoder.search('Berlin', 'en', {
      country: 'DE',
      cityName: '',
      lat: 52.52,
      lon: 13.405,
    })

    expect(mockProviderSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), {
      lat: 52.52,
      lon: 13.405,
    })
  })

  it('omits bias when locationBias has no coords', async () => {
    mockProviderSearch.mockResolvedValue([])

    const geocoder = useGeocoder()
    await geocoder.search('Berlin', 'en', { country: 'DE', cityName: '' })

    expect(mockProviderSearch).toHaveBeenCalledWith('Berlin', 'en', expect.any(AbortSignal), null)
  })

  it('caps results to the default take of 5', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `City${i}`,
      country: 'DE',
      lat: 0,
      lon: 0,
    }))
    mockProviderSearch.mockResolvedValue(many)

    const geocoder = useGeocoder()
    await geocoder.search('city', 'en')

    expect(geocoder.results.value).toHaveLength(5)
  })

  it('respects an explicit take parameter', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `City${i}`,
      country: 'DE',
      lat: 0,
      lon: 0,
    }))
    mockProviderSearch.mockResolvedValue(many)

    const geocoder = useGeocoder()
    await geocoder.search('city', 'en', null, 3)

    expect(geocoder.results.value).toHaveLength(3)
  })

  it('reports an empty geocoder result to Sentry', async () => {
    mockProviderSearch.mockResolvedValue([])

    const geocoder = useGeocoder()
    await geocoder.search('Atlantis', 'en')

    expect(mockCaptureMessage).toHaveBeenCalledTimes(1)
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'Geocoder returned no results',
      expect.objectContaining({
        level: 'info',
        tags: { feature: 'geocoding', outcome: 'empty' },
        extra: expect.objectContaining({ query: 'Atlantis', lang: 'en' }),
      })
    )
  })

  it('does not report to Sentry when results are non-empty', async () => {
    mockProviderSearch.mockResolvedValue([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])

    const geocoder = useGeocoder()
    await geocoder.search('Berlin', 'en')

    expect(mockCaptureMessage).not.toHaveBeenCalled()
  })

  it('does not treat a CanceledError as a real failure', async () => {
    const canceledError = Object.assign(new Error('canceled'), { name: 'CanceledError' })
    mockProviderSearch.mockRejectedValue(canceledError)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const geocoder = useGeocoder()
    const results = await geocoder.search('Berlin', 'en')

    expect(consoleSpy).not.toHaveBeenCalled()
    expect(results).toEqual([])
    consoleSpy.mockRestore()
  })

  it('setResults mutates results reactively', () => {
    const geocoder = useGeocoder()
    expect(geocoder.results.value).toEqual([])
    expect(geocoder.hasResults.value).toBe(false)

    geocoder.setResults([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])

    expect(geocoder.results.value).toHaveLength(1)
    expect(geocoder.hasResults.value).toBe(true)
  })

  it('isolates state between independent instances', async () => {
    mockProviderSearch.mockResolvedValueOnce([
      { name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 },
    ])
    mockProviderSearch.mockResolvedValueOnce([
      { name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 },
    ])

    const a = useGeocoder()
    const b = useGeocoder()

    await a.search('Berlin', 'en')
    await b.search('Paris', 'en')

    expect(a.results.value).toEqual([{ name: 'Berlin', country: 'DE', lat: 52.5, lon: 13.4 }])
    expect(b.results.value).toEqual([{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }])

    a.clear()
    expect(a.results.value).toEqual([])
    expect(b.results.value).toEqual([{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }])
  })
})
