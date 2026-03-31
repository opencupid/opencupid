import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { CanceledError } from 'axios'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api: { get: mockGet },
  safeApiCall: (fn: () => any) => fn(),
  isApiOnline: () => Promise.resolve(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useFindProfileStore } from '../findProfileStore'

describe('findProfileStore.findClustersForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }
  const mockClusterResult = {
    cluster: true,
    clusterId: 1,
    count: 5,
    lat: 47,
    lon: 19,
    expansionZoom: 9,
  }
  const mockPointResult = {
    cluster: false,
    profileId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    lat: 47,
    lon: 19,
  }

  it('calls the clusters endpoint with padded bounds and zoom', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockPointResult], profiles: [mockProfile] },
    })

    await store.findClustersForMapBounds(bounds)

    const expectedPadded = {
      south: bounds.south - (bounds.north - bounds.south) * 0.3,
      north: bounds.north + (bounds.north - bounds.south) * 0.3,
      west: bounds.west - (bounds.east - bounds.west) * 0.3,
      east: bounds.east + (bounds.east - bounds.west) * 0.3,
      zoom: bounds.zoom,
    }
    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/clusters',
      expect.objectContaining({
        params: expectedPadded,
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('updates mapClusters and mapProfiles with fetched results', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockClusterResult, mockPointResult], profiles: [mockProfile] },
    })

    await store.findClustersForMapBounds(bounds)

    expect(store.mapClusters).toHaveLength(2)
    expect(store.mapProfiles).toHaveLength(1)
    expect(store.mapProfiles[0]!.id).toBe(mockProfile.id)
  })

  it('sets isLoading during fetch', async () => {
    let resolveGet: any
    mockGet.mockReturnValue(new Promise((r) => (resolveGet = r)))

    const promise = store.findClustersForMapBounds(bounds)
    expect(store.isLoading).toBe(true)

    resolveGet({ data: { clusters: [], profiles: [] } })
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('aborts previous request when a new one starts', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    let resolveFirst: any
    mockGet.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))

    const first = store.findClustersForMapBounds(bounds)
    abortSpy.mockClear()

    mockGet.mockResolvedValueOnce({ data: { clusters: [], profiles: [] } })
    const second = store.findClustersForMapBounds(bounds)

    expect(abortSpy).toHaveBeenCalledTimes(1)

    resolveFirst({ data: { clusters: [], profiles: [] } })
    await Promise.allSettled([first, second])

    abortSpy.mockRestore()
  })

  it('silently ignores CanceledError from aborted requests', async () => {
    mockGet.mockRejectedValueOnce(new CanceledError('canceled'))

    const result = await store.findClustersForMapBounds(bounds)

    expect(result.success).toBe(true)
    expect(store.mapClusters).toEqual([])
  })

  it('returns error for non-cancel failures', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const result = await store.findClustersForMapBounds(bounds)

    expect(result.success).toBe(false)
  })

  it('stores lastMapBounds for later re-fetch', async () => {
    mockGet.mockResolvedValue({ data: { clusters: [], profiles: [] } })

    expect(store.lastMapBounds).toBeNull()
    await store.findClustersForMapBounds(bounds)
    expect(store.lastMapBounds).toEqual(bounds)
  })
})

describe('findProfileStore.refetchBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches match IDs and re-fetches map when lastMapBounds is set', async () => {
    mockGet.mockResolvedValue({ data: { clusters: [], profiles: [], ids: ['p1'] } })
    store.lastMapBounds = bounds

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/dating/match-ids')
    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/clusters',
      expect.objectContaining({
        params: expect.objectContaining({
          south: bounds.south - (bounds.north - bounds.south) * 0.3,
          north: bounds.north + (bounds.north - bounds.south) * 0.3,
          west: bounds.west - (bounds.east - bounds.west) * 0.3,
          east: bounds.east + (bounds.east - bounds.west) * 0.3,
          zoom: bounds.zoom,
        }),
      })
    )
  })

  it('fetches match IDs only when lastMapBounds is null', async () => {
    mockGet.mockResolvedValue({ data: { ids: [] } })

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/dating/match-ids')
    expect(mockGet).not.toHaveBeenCalledWith('/find/social/map/clusters', expect.anything())
  })
})

describe('findProfileStore bounds caching', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }
  const mockPointResult = {
    cluster: false,
    profileId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    lat: 47,
    lon: 19,
  }

  it('skips API call when requested bounds are within cached bounds at same zoom', async () => {
    mockGet.mockResolvedValueOnce({
      data: { clusters: [mockPointResult], profiles: [mockProfile] },
    })

    const largeBounds = { south: 40, north: 50, west: 10, east: 30, zoom: 7 }
    await store.findClustersForMapBounds(largeBounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
    mockGet.mockClear()

    const smallBounds = { south: 44, north: 48, west: 14, east: 24, zoom: 7 }
    await store.findClustersForMapBounds(smallBounds)
    expect(mockGet).not.toHaveBeenCalled()
    expect(store.mapProfiles).toHaveLength(1)
  })

  it('fetches from API when zoom level changes', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockPointResult], profiles: [mockProfile] },
    })

    const bounds1 = { south: 40, north: 50, west: 10, east: 30, zoom: 7 }
    await store.findClustersForMapBounds(bounds1)
    mockGet.mockClear()

    const bounds2 = { south: 44, north: 48, west: 14, east: 24, zoom: 9 }
    await store.findClustersForMapBounds(bounds2)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('fetches from API when bounds extend beyond cached area', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockPointResult], profiles: [mockProfile] },
    })

    const bounds1 = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    await store.findClustersForMapBounds(bounds1)
    mockGet.mockClear()

    const bounds2 = { south: 35, north: 40, west: 16, east: 23, zoom: 7 }
    await store.findClustersForMapBounds(bounds2)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on teardown', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockPointResult], profiles: [mockProfile] },
    })

    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    await store.findClustersForMapBounds(bounds)
    mockGet.mockClear()

    store.teardown()

    mockGet.mockResolvedValue({ data: { clusters: [], profiles: [] } })
    await store.findClustersForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on refetchBounds', async () => {
    mockGet.mockResolvedValue({
      data: { clusters: [mockPointResult], profiles: [mockProfile], ids: [] },
    })

    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    await store.findClustersForMapBounds(bounds)
    mockGet.mockClear()

    mockGet.mockResolvedValue({ data: { clusters: [], profiles: [], ids: [] } })
    store.lastMapBounds = bounds
    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/social/map/clusters', expect.anything())
  })
})
