import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// --- Mocks ---

const routerReplace = vi.fn()
const routerPush = vi.fn()

const routeRef = ref({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
  fullPath: '/browse',
})

vi.mock('vue-router', () => ({
  useRoute: () => routeRef.value,
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
}))

const mockGetPreviousUrl = vi.fn(() => '/browse')
vi.mock('@/router', () => ({
  getPreviousUrl: () => mockGetPreviousUrl(),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

const mockFindProfileStore = {
  isLoading: false,
  isLoadingMore: false,
  hasMoreProfiles: false,
  profileList: [],
  socialFilter: null,
  findSocial: vi.fn(),
  findSocialForMap: vi.fn(),
  fetchSocialFilter: vi.fn(),
  persistSocialFilter: vi.fn(),
  loadMoreSocial: vi.fn(),
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
  scopes: ['social', 'dating'] as string[],
}
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockOwnerStore,
}))

import { useSocialMatchViewModel } from '../useSocialMatchViewModel'

describe('useSocialMatchViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeRef.value = {
      params: {},
      query: {},
      fullPath: '/browse',
    }
    mockGetPreviousUrl.mockReturnValue('/browse')
  })

  it('selectedProfileId starts null when no route param', () => {
    const { selectedProfileId } = useSocialMatchViewModel()
    expect(selectedProfileId.value).toBeNull()
  })

  it('selectedProfileId initializes from route param', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    const { selectedProfileId } = useSocialMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')
  })

  it('openProfile sets selectedProfileId and calls router.replace', () => {
    const { openProfile, selectedProfileId } = useSocialMatchViewModel()
    openProfile('profile-42')
    expect(selectedProfileId.value).toBe('profile-42')
    expect(routerReplace).toHaveBeenCalledWith({
      name: 'PublicProfile',
      params: { profileId: 'profile-42' },
    })
  })

  it('closeProfile clears selectedProfileId and navigates back', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/browse')
    const { closeProfile, selectedProfileId } = useSocialMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')

    closeProfile()
    expect(selectedProfileId.value).toBeNull()
    expect(routerReplace).toHaveBeenCalledWith('/browse')
  })

  it('closeProfile navigates to SocialMatch when previousUrl is a profile URL', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/profile/other-id')

    const { closeProfile } = useSocialMatchViewModel()
    closeProfile()

    expect(routerReplace).toHaveBeenCalledWith({ name: 'SocialMatch' })
  })

  it('initialize fetches social filter and calls findSocial for grid', async () => {
    routeRef.value = {
      params: {},
      query: { viewMode: 'grid' },
      fullPath: '/browse?viewMode=grid',
    }
    const vm = useSocialMatchViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.fetchSocialFilter).toHaveBeenCalled()
    expect(mockFindProfileStore.findSocial).toHaveBeenCalled()
    expect(mockFindProfileStore.findSocialForMap).not.toHaveBeenCalled()
  })

  it('initialize calls findSocialForMap for map viewMode', async () => {
    routeRef.value = {
      params: {},
      query: { viewMode: 'map' },
      fullPath: '/browse?viewMode=map',
    }
    const vm = useSocialMatchViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.findSocialForMap).toHaveBeenCalled()
    expect(mockFindProfileStore.findSocial).not.toHaveBeenCalled()
  })

  it('re-fetches when viewMode changes from grid to map', async () => {
    routeRef.value = {
      params: {},
      query: { viewMode: 'grid' },
      fullPath: '/browse?viewMode=grid',
    }
    const vm = useSocialMatchViewModel()
    await vm.initialize()

    mockFindProfileStore.findSocial.mockClear()
    mockFindProfileStore.findSocialForMap.mockClear()

    routeRef.value.query = { viewMode: 'map' }
    routeRef.value.fullPath = '/browse?viewMode=map'
    await nextTick()

    expect(mockFindProfileStore.findSocialForMap).toHaveBeenCalled()
    expect(mockFindProfileStore.findSocial).not.toHaveBeenCalled()
  })

  it('loadMoreProfiles calls loadMoreSocial', async () => {
    const vm = useSocialMatchViewModel()
    await vm.loadMoreProfiles()
    expect(mockFindProfileStore.loadMoreSocial).toHaveBeenCalled()
  })
})
