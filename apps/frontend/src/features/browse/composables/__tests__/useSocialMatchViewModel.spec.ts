import { describe, it, expect, beforeEach, vi } from 'vitest'

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
  matchedProfileIds: new Set<string>(),
  lastMapBounds: null as { south: number; north: number; west: number; east: number } | null,
  fetchDatingMatchIds: vi.fn(),
  findProfilesForMapBounds: vi.fn(),
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
  matchFilter: null,
  fetchMatchFilter: vi.fn(),
  persistMatchFilter: vi.fn(),
}
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockOwnerStore,
}))

import { useSocialMatchViewModel } from '../useSocialMatchViewModel'

describe('useSocialMatchViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('onBoundsChanged calls findProfilesForMapBounds on the store', async () => {
    mockFindProfileStore.findProfilesForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useSocialMatchViewModel()
    const bounds = { south: 45, north: 48, west: 16, east: 23 }

    await vm.onBoundsChanged(bounds)

    expect(mockFindProfileStore.findProfilesForMapBounds).toHaveBeenCalledWith(bounds)
  })

  it('onBoundsChanged skips fetch when bounds are identical to lastMapBounds', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    mockFindProfileStore.lastMapBounds = { ...bounds }
    mockFindProfileStore.findProfilesForMapBounds = vi.fn().mockResolvedValue({ success: true })
    const vm = useSocialMatchViewModel()

    await vm.onBoundsChanged(bounds)

    expect(mockFindProfileStore.findProfilesForMapBounds).not.toHaveBeenCalled()
    mockFindProfileStore.lastMapBounds = null
  })

  it('fetches match IDs and map profiles in parallel when lastMapBounds exists', async () => {
    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    mockFindProfileStore.lastMapBounds = bounds
    mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
    mockFindProfileStore.findProfilesForMapBounds = vi.fn().mockResolvedValue({ success: true })

    const vm = useSocialMatchViewModel()

    let matchIdsCallTime = 0
    let boundsCallTime = 0
    mockFindProfileStore.fetchDatingMatchIds = vi.fn(() => {
      matchIdsCallTime = Date.now()
      return Promise.resolve()
    })
    mockFindProfileStore.findProfilesForMapBounds = vi.fn(() => {
      boundsCallTime = Date.now()
      return Promise.resolve({ success: true })
    })

    await vm.initialize()

    expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
    expect(mockFindProfileStore.findProfilesForMapBounds).toHaveBeenCalledWith(bounds)
    expect(Math.abs(matchIdsCallTime - boundsCallTime)).toBeLessThan(5)

    mockFindProfileStore.lastMapBounds = null
  })

  it('exposes matchedProfileIds from store', () => {
    mockFindProfileStore.matchedProfileIds = new Set(['p1', 'p2'])
    const vm = useSocialMatchViewModel()
    expect(vm.matchedProfileIds.value.has('p1')).toBe(true)
    expect(vm.matchedProfileIds.value.has('p2')).toBe(true)
    expect(vm.matchedProfileIds.value.has('p3')).toBe(false)
    mockFindProfileStore.matchedProfileIds = new Set()
  })
})
