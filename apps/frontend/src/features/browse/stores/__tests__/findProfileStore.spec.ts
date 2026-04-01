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

describe('findProfileStore.findProfilesForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  const bounds = { south: 45, north: 48, west: 16, east: 23 }
  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }

  it('calls the bounded map endpoint with padded bounds params', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    await store.findProfilesForMapBounds(bounds)

    const expectedPadded = {
      south: bounds.south - (bounds.north - bounds.south) * 0.3,
      north: bounds.north + (bounds.north - bounds.south) * 0.3,
      west: bounds.west - (bounds.east - bounds.west) * 0.3,
      east: bounds.east + (bounds.east - bounds.west) * 0.3,
    }
    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/bounds',
      expect.objectContaining({
        params: expectedPadded,
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('updates profileList with fetched results', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    await store.findProfilesForMapBounds(bounds)

    expect(store.profileList).toHaveLength(1)
    expect(store.profileList[0]!.id).toBe(mockProfile.id)
  })

  it('sets isLoading during fetch', async () => {
    let resolveGet: any
    mockGet.mockReturnValue(new Promise((r) => (resolveGet = r)))

    const promise = store.findProfilesForMapBounds(bounds)
    expect(store.isLoading).toBe(true)

    resolveGet({ data: { profiles: [] } })
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('aborts previous request when a new one starts', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    let resolveFirst: any
    mockGet.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))

    const first = store.findProfilesForMapBounds(bounds)
    // Clear any abort calls from the first invocation (cleaning up stale controller from prior tests)
    abortSpy.mockClear()

    mockGet.mockResolvedValueOnce({ data: { profiles: [] } })
    const second = store.findProfilesForMapBounds(bounds)

    expect(abortSpy).toHaveBeenCalledTimes(1)

    resolveFirst({ data: { profiles: [] } })
    await Promise.allSettled([first, second])

    abortSpy.mockRestore()
  })

  it('silently ignores CanceledError from aborted requests', async () => {
    mockGet.mockRejectedValueOnce(new CanceledError('canceled'))

    const result = await store.findProfilesForMapBounds(bounds)

    expect(result.success).toBe(true)
    expect(store.profileList).toEqual([])
  })

  it('returns error for non-cancel failures', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const result = await store.findProfilesForMapBounds(bounds)

    expect(result.success).toBe(false)
  })

  it('stores lastMapBounds for later re-fetch', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [] } })

    expect(store.lastMapBounds).toBeNull()
    await store.findProfilesForMapBounds(bounds)
    expect(store.lastMapBounds).toEqual(bounds)
  })
})

describe('findProfileStore.refetchBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('re-fetches clusters when lastMapBounds is set', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [] } })
    store.lastMapBounds = bounds

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/clusters',
      expect.objectContaining({
        params: expect.objectContaining({
          south: expect.any(Number),
          north: expect.any(Number),
          west: expect.any(Number),
          east: expect.any(Number),
          zoom: expect.any(Number),
        }),
      })
    )
  })

  it('does nothing when lastMapBounds is null', async () => {
    await store.refetchBounds()

    expect(mockGet).not.toHaveBeenCalled()
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

  it('skips API call when requested bounds are within cached bounds', async () => {
    mockGet.mockResolvedValueOnce({ data: { profiles: [mockProfile] } })

    const largeBounds = { south: 40, north: 50, west: 10, east: 30 }
    await store.findProfilesForMapBounds(largeBounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
    mockGet.mockClear()

    const smallBounds = { south: 44, north: 48, west: 14, east: 24 }
    await store.findProfilesForMapBounds(smallBounds)
    expect(mockGet).not.toHaveBeenCalled()
    expect(store.profileList).toHaveLength(1)
  })

  it('fetches from API when bounds extend beyond cached area', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    const bounds1 = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds1)
    mockGet.mockClear()

    const bounds2 = { south: 35, north: 40, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds2)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on teardown', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    store.teardown()

    mockGet.mockResolvedValue({ data: { profiles: [] } })
    await store.findProfilesForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on refetchBounds', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile], features: [] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    mockGet.mockResolvedValue({ data: { success: true, features: [], profiles: [] } })
    store.lastMapBounds = bounds
    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/clusters',
      expect.anything()
    )
  })
})

describe('findClustersForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches clusters from the cluster endpoint with bounds and zoom', async () => {
    const mockFeatures = [
      { type: 'cluster', id: 1, lat: 47.5, lon: 19.0, count: 5, expansionZoom: 8 },
      {
        type: 'point',
        id: 'p1',
        lat: 48.2,
        lon: 16.3,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
    ]
    mockGet.mockResolvedValue({ data: { success: true, features: mockFeatures } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }
    await store.findClustersForMapBounds(bounds, 6)

    expect(mockGet).toHaveBeenCalledWith('/find/social/map/clusters', expect.objectContaining({
      params: expect.objectContaining({ south: expect.any(Number), north: expect.any(Number), west: expect.any(Number), east: expect.any(Number), zoom: 6 }),
    }))
    expect(store.clusterFeatures).toHaveLength(2)
  })

  it('always refetches on zoom change even if bounds are cached', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [] } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    await store.findClustersForMapBounds(bounds, 6)
    mockGet.mockClear()

    // Same bounds, different zoom — must refetch
    await store.findClustersForMapBounds(bounds, 8)
    expect(mockGet).toHaveBeenCalled()
  })

  it('cancels in-flight request on new call', async () => {
    let resolveFirst: (v: any) => void
    const firstCall = new Promise((r) => { resolveFirst = r })
    mockGet.mockImplementationOnce(() => firstCall)
    mockGet.mockResolvedValueOnce({ data: { success: true, features: [] } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    const p1 = store.findClustersForMapBounds(bounds, 6)
    const p2 = store.findClustersForMapBounds(bounds, 7)

    resolveFirst!({ data: { success: true, features: [] } })
    await Promise.all([p1, p2])

    expect(store.clusterFeatures).toEqual([])
  })
})

describe('fetchProfileForPopup', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches a single profile by ID', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    const result = await store.fetchProfileForPopup('p1')

    expect(mockGet).toHaveBeenCalledWith('/profiles/p1')
    expect(result).toEqual(mockProfile)
  })

  it('caches repeated fetches for the same profile', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    await store.fetchProfileForPopup('p1')
    await store.fetchProfileForPopup('p1')

    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
