import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMapStore } from '@/features/map/stores/mapStore'

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
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })
    store.lastMapBounds = bounds

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
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

describe('findClustersForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches clusters and tags from the cluster endpoint', async () => {
    const mockFeatures = [
      { type: 'cluster', id: 1, lat: 47.5, lon: 19.0, count: 5, expansionZoom: 8 },
      {
        type: 'point',
        kind: 'profile',
        id: 'p1',
        lat: 48.2,
        lon: 16.3,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
    ]
    const mockTags = [{ id: 'cltagabc000000000000001', name: 'Biokert', slug: 'biokert' }]
    mockGet.mockResolvedValue({ data: { success: true, features: mockFeatures, tags: mockTags } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }
    await store.findClustersForMapBounds(bounds, 6)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({
          south: expect.any(Number),
          north: expect.any(Number),
          west: expect.any(Number),
          east: expect.any(Number),
          zoom: 6,
        }),
      })
    )
    expect(store.clusterFeatures).toHaveLength(2)
    expect(store.availableTags).toHaveLength(1)
    expect(store.availableTags[0]!.name).toBe('Biokert')
  })

  it('always refetches on zoom change even if bounds are cached', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    await store.findClustersForMapBounds(bounds, 6)
    mockGet.mockClear()

    // Same bounds, different zoom — must refetch
    await store.findClustersForMapBounds(bounds, 8)
    expect(mockGet).toHaveBeenCalled()
  })

  it('cancels in-flight request on new call', async () => {
    let resolveFirst: (v: any) => void
    const firstCall = new Promise((r) => {
      resolveFirst = r
    })
    mockGet.mockImplementationOnce(() => firstCall)
    mockGet.mockResolvedValueOnce({ data: { success: true, features: [], tags: [] } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    const p1 = store.findClustersForMapBounds(bounds, 6)
    const p2 = store.findClustersForMapBounds(bounds, 7)

    resolveFirst!({ data: { success: true, features: [], tags: [] } })
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

    expect(mockGet).toHaveBeenCalledWith('/profiles/p1', expect.objectContaining({}))
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

describe('findClustersForMapBounds with layer kinds', () => {
  let store: ReturnType<typeof useFindProfileStore>
  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('sends kinds=profile,post when both layers are on', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile,post' }),
      })
    )
  })

  it('sends kinds=post when only Posts is selected', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    const mapStore = useMapStore()
    mapStore.setShowPeople(false)

    await store.findClustersForMapBounds(bounds, 7)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'post' }),
      })
    )
  })

  it('skips network when same kinds + same viewport are already cached', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetches when kinds changes even with the same viewport', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)

    useMapStore().setShowPosts(false)

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile' }),
      })
    )
  })
})
