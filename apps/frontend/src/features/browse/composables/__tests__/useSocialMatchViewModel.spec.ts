import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'

// --- Mocks ---

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

const mockFindProfileStore = {
  isLoading: false,
  profileList: [],
  mapClusters: [] as any[],
  mapProfiles: [] as any[],
  matchedProfileIds: new Set<string>(),
  lastMapBounds: null as {
    south: number
    north: number
    west: number
    east: number
    zoom: number
  } | null,
  fetchDatingMatchIds: vi.fn(),
  findClustersForMapBounds: vi.fn(),
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
  matchFilter: null as SocialMatchFilterDTO | null,
  fetchMatchFilter: vi.fn(),
  persistMatchFilter: vi.fn(),
  setMatchFilterTags: vi.fn(),
}
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockOwnerStore,
}))

import { useSocialMatchViewModel } from '../useSocialMatchViewModel'

describe('useSocialMatchViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOwnerStore.matchFilter = null
    mockFindProfileStore.lastMapBounds = null
  })

  it('openProfile navigates to PublicProfile route', () => {
    const { openProfile } = useSocialMatchViewModel()
    openProfile('profile-42')
    expect(routerPush).toHaveBeenCalledWith({
      name: 'PublicProfile',
      params: { profileId: 'profile-42' },
    })
  })

  it('initialize fetches social filter and match IDs (map profiles loaded via bounds)', async () => {
    const vm = useSocialMatchViewModel()
    await vm.initialize()

    expect(mockOwnerStore.fetchMatchFilter).toHaveBeenCalled()
    expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
  })

  it('initialize sets isInitialized to true', async () => {
    const vm = useSocialMatchViewModel()
    expect(vm.isInitialized.value).toBe(false)
    await vm.initialize()
    expect(vm.isInitialized.value).toBe(true)
  })

  it('hideProfile delegates to store', () => {
    const vm = useSocialMatchViewModel()
    vm.hideProfile('abc')
    expect(mockFindProfileStore.hide).toHaveBeenCalledWith('abc')
  })

  it('onBoundsChanged calls findClustersForMapBounds on the store', async () => {
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useSocialMatchViewModel()
    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }

    await vm.onBoundsChanged(bounds)

    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds)
  })

  it('onBoundsChanged skips fetch when bounds are identical to lastMapBounds', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    mockFindProfileStore.lastMapBounds = { ...bounds }
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useSocialMatchViewModel()

    await vm.onBoundsChanged(bounds)

    expect(mockFindProfileStore.findClustersForMapBounds).not.toHaveBeenCalled()
  })

  it('fetches match IDs and map profiles in parallel when lastMapBounds exists', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    mockFindProfileStore.lastMapBounds = bounds
    mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })

    const vm = useSocialMatchViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds)

    // Both calls should be dispatched before either resolves — verify via
    // invocationCallOrder which is deterministic (no timer-based flakiness)
    const matchOrder = mockFindProfileStore.fetchDatingMatchIds.mock.invocationCallOrder[0]!
    const boundsOrder = mockFindProfileStore.findClustersForMapBounds.mock.invocationCallOrder[0]!
    expect(Math.abs(matchOrder - boundsOrder)).toBe(1)
  })

  it('exposes matchedProfileIds from store', () => {
    mockFindProfileStore.matchedProfileIds = new Set(['p1', 'p2'])
    const vm = useSocialMatchViewModel()
    expect(vm.matchedProfileIds.value.has('p1')).toBe(true)
    expect(vm.matchedProfileIds.value.has('p2')).toBe(true)
    expect(vm.matchedProfileIds.value.has('p3')).toBe(false)
    mockFindProfileStore.matchedProfileIds = new Set()
  })

  it('updatePrefs invalidates map cache before fetching bounded results', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
    mockFindProfileStore.lastMapBounds = bounds
    mockOwnerStore.persistMatchFilter = vi.fn().mockResolvedValue({ success: true })
    mockFindProfileStore.invalidateMapCache = vi.fn()
    mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
    mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })

    const vm = useSocialMatchViewModel()
    await vm.updatePrefs()

    expect(mockFindProfileStore.invalidateMapCache).toHaveBeenCalledTimes(1)
    expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds)
    expect(
      mockFindProfileStore.invalidateMapCache.mock.invocationCallOrder[0]! <
        mockFindProfileStore.findClustersForMapBounds.mock.invocationCallOrder[0]!
    ).toBe(true)
  })

  describe('refreshIfFilterChanged', () => {
    it('does nothing when filter has not changed since last render', async () => {
      const filter = { location: { country: 'DE', lat: 1, lon: 2 }, radius: 10, tags: [] }
      mockOwnerStore.matchFilter = { ...filter }
      mockOwnerStore.fetchMatchFilter = vi.fn()
      mockFindProfileStore.invalidateMapCache = vi.fn()
      mockFindProfileStore.fetchDatingMatchIds = vi.fn()
      mockFindProfileStore.findClustersForMapBounds = vi.fn()
      mockFindProfileStore.lastMapBounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }

      const vm = useSocialMatchViewModel()
      // initialize sets the snapshot to the current filter
      await vm.initialize()
      vi.clearAllMocks()

      await vm.refreshIfFilterChanged()

      expect(mockFindProfileStore.invalidateMapCache).not.toHaveBeenCalled()
      expect(mockFindProfileStore.fetchDatingMatchIds).not.toHaveBeenCalled()
      expect(mockFindProfileStore.findClustersForMapBounds).not.toHaveBeenCalled()
    })

    it('invalidates cache and refetches when filter was mutated externally before activation', async () => {
      const initialFilter = { location: { country: 'DE', lat: 1, lon: 2 }, radius: 10, tags: [] }
      const updatedFilter = {
        location: { country: 'DE', lat: 1, lon: 2 },
        radius: 10,
        tags: [{ id: 't1', slug: 'hiking', name: 'Hiking' }],
      }
      mockOwnerStore.matchFilter = { ...initialFilter }
      mockOwnerStore.fetchMatchFilter = vi.fn()
      mockFindProfileStore.invalidateMapCache = vi.fn()
      mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
      mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
      const bounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }
      mockFindProfileStore.lastMapBounds = bounds

      const vm = useSocialMatchViewModel()
      await vm.initialize()

      // Simulate external mutation (e.g. UserHome tag-cloud sets a tag without persisting)
      mockOwnerStore.matchFilter = { ...updatedFilter }
      vi.clearAllMocks()

      await vm.refreshIfFilterChanged()

      // Must not re-fetch the filter from API — the local mutation is the source of truth
      expect(mockOwnerStore.fetchMatchFilter).not.toHaveBeenCalled()
      expect(mockFindProfileStore.invalidateMapCache).toHaveBeenCalledTimes(1)
      expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
      expect(mockFindProfileStore.findClustersForMapBounds).toHaveBeenCalledWith(bounds)
    })

    it('does not re-trigger a second refetch if called again with unchanged filter', async () => {
      const filter = { location: { country: 'DE', lat: 1, lon: 2 }, radius: 10, tags: [] }
      const updatedFilter = { location: { country: 'FR', lat: 3, lon: 4 }, radius: 20, tags: [] }
      mockOwnerStore.matchFilter = { ...filter }
      mockOwnerStore.fetchMatchFilter = vi.fn()
      mockFindProfileStore.invalidateMapCache = vi.fn()
      mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
      mockFindProfileStore.findClustersForMapBounds = vi.fn().mockResolvedValue({ success: true })
      mockFindProfileStore.lastMapBounds = { south: 45, north: 48, west: 16, east: 23, zoom: 7 }

      const vm = useSocialMatchViewModel()
      await vm.initialize()

      mockOwnerStore.matchFilter = { ...updatedFilter }
      await vm.refreshIfFilterChanged() // first call — should refetch
      vi.clearAllMocks()

      await vm.refreshIfFilterChanged() // second call — filter unchanged, should skip
      expect(mockFindProfileStore.invalidateMapCache).not.toHaveBeenCalled()
    })
  })
})
