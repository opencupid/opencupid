import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mocks ---

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

const mockFindProfileStore = {
  isLoading: false,
  profileList: [],
  clusterFeatures: [] as any[],
  matchedProfileIds: new Set<string>(),
  lastMapBounds: null as { south: number; north: number; west: number; east: number } | null,
  fetchDatingMatchIds: vi.fn(),
  findProfilesForMapBounds: vi.fn(),
  findClustersForMapBounds: vi.fn(),
  fetchProfileForPopup: vi.fn(),
  invalidateMapCache: vi.fn(),
  hide: vi.fn(),
  teardown: vi.fn(),
}
vi.mock('@/features/browse/stores/findProfileStore', () => ({
  useFindProfileStore: () => mockFindProfileStore,
}))

const mockOwnerStore = {
  profile: {
    birthday: '1990-01-01',
    isDatingActive: true,
    isSocialActive: true,
    location: { country: 'US', city: 'NYC', lat: 0, lng: 0 },
    tags: [],
  },
  isLoading: false,
}
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockOwnerStore,
}))

import { useProfilesViewModel } from '../useProfilesViewModel'

describe('useProfilesViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindProfileStore.lastMapBounds = null
  })

  it('initialize sets isInitialized to true', async () => {
    const vm = useProfilesViewModel()
    expect(vm.isInitialized.value).toBe(false)
    await vm.initialize()
    expect(vm.isInitialized.value).toBe(true)
  })

  it('hideProfile delegates to store', () => {
    const vm = useProfilesViewModel()
    vm.hideProfile('abc')
    expect(mockFindProfileStore.hide).toHaveBeenCalledWith('abc')
  })

  it('onBoundsChanged calls findClustersForMapBounds on the store', async () => {
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useProfilesViewModel()
    const bounds = { south: 45, north: 48, west: 16, east: 23 }

    await vm.onBoundsChanged({ bounds, zoom: 6 })

    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds, 6)
  })

  it('onBoundsChanged skips fetch when bounds and zoom are identical', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    mockFindProfileStore.lastMapBounds = { ...bounds }
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useProfilesViewModel()

    // First call to set lastZoom
    await vm.onBoundsChanged({ bounds, zoom: 6 })
    vi.clearAllMocks()

    // Same bounds + same zoom — should skip
    await vm.onBoundsChanged({ bounds, zoom: 6 })

    expect(mockFindProfileStore.findClustersForMapBounds).not.toHaveBeenCalled()
  })

  it('fetches clusters when lastMapBounds exists on initialize', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    mockFindProfileStore.lastMapBounds = bounds
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })

    const vm = useProfilesViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds, 7)
  })

  it('exposes clusterFeatures from store', () => {
    mockFindProfileStore.clusterFeatures = [
      {
        type: 'point',
        id: 'p1',
        lat: 47,
        lon: 19,
        publicName: 'A',
        image: null,
        highlighted: false,
      },
    ]
    const vm = useProfilesViewModel()
    expect(vm.clusterFeatures.value).toHaveLength(1)
    mockFindProfileStore.clusterFeatures = []
  })

  it('refetchForCurrentBounds invalidates cache before refetching', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    mockFindProfileStore.lastMapBounds = bounds
    mockFindProfileStore.invalidateMapCache = vi.fn()
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })

    const vm = useProfilesViewModel()
    await vm.refetchForCurrentBounds()

    expect(mockFindProfileStore.invalidateMapCache).toHaveBeenCalledTimes(1)
    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds, 7)
    expect(
      mockFindProfileStore.invalidateMapCache.mock.invocationCallOrder[0]! <
        mockFindProfileStore.findClustersForMapBounds.mock.invocationCallOrder[0]!
    ).toBe(true)
  })
})
