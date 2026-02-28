import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

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
  socialFilter: null,
  findSocialForMap: vi.fn(),
  fetchSocialFilter: vi.fn(),
  fetchDatingMatchIds: vi.fn(),
  persistSocialFilter: vi.fn(),
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

  it('initialize fetches social filter, map profiles, and match IDs', async () => {
    const vm = useSocialMatchViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.fetchSocialFilter).toHaveBeenCalled()
    expect(mockFindProfileStore.findSocialForMap).toHaveBeenCalled()
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

  it('haveAccess is true when profile isSocialActive', () => {
    const vm = useSocialMatchViewModel()
    expect(vm.haveAccess.value).toBe(true)
  })

  it('haveAccess is false when profile is null', () => {
    const original = mockOwnerStore.profile
    mockOwnerStore.profile = null as any
    const vm = useSocialMatchViewModel()
    expect(vm.haveAccess.value).toBe(false)
    mockOwnerStore.profile = original
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
