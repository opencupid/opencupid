import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// --- Mocks ---

const routerReplace = vi.fn()
const routerPush = vi.fn()

const routeRef = ref({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
  fullPath: '/browse/social',
})

vi.mock('vue-router', () => ({
  useRoute: () => routeRef.value,
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
}))

const mockGetPreviousUrl = vi.fn(() => '/browse/social')
vi.mock('@/router', () => ({
  getPreviousUrl: () => mockGetPreviousUrl(),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

const mockLocalStore = {
  getCurrentScope: null as string | null,
  setCurrentScope: vi.fn(),
}
vi.mock('@/store/localStore', () => ({
  useLocalStore: () => mockLocalStore,
}))

const mockFindProfileStore = {
  isLoading: false,
  isLoadingMore: false,
  hasMoreProfiles: false,
  profileList: [],
  datingPrefs: null,
  socialFilter: null,
  findSocial: vi.fn(),
  findDating: vi.fn(),
  fetchSocialFilter: vi.fn(),
  fetchDatingPrefs: vi.fn(),
  persistSocialFilter: vi.fn(),
  persistDatingPrefs: vi.fn(),
  loadMoreSocial: vi.fn(),
  loadMoreDating: vi.fn(),
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

vi.mock('@/features/shared/composables/useAgeFields', () => ({
  useAgeFields: () => ({ age: ref(30) }),
}))

import { useFindMatchViewModel } from '../useFindMatchViewModel'

describe('useFindMatchViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeRef.value = {
      params: {},
      query: {},
      fullPath: '/browse/social',
    }
    mockGetPreviousUrl.mockReturnValue('/browse/social')
    mockOwnerStore.scopes = ['social', 'dating']
    mockLocalStore.getCurrentScope = null
  })

  it('selectedProfileId starts null when no route param', () => {
    const { selectedProfileId } = useFindMatchViewModel()
    expect(selectedProfileId.value).toBeNull()
  })

  it('selectedProfileId initializes from route param', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    const { selectedProfileId } = useFindMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')
  })

  it('openProfile sets selectedProfileId and calls router.replace', () => {
    const { openProfile, selectedProfileId } = useFindMatchViewModel()
    openProfile('profile-42')
    expect(selectedProfileId.value).toBe('profile-42')
    expect(routerReplace).toHaveBeenCalledWith({
      name: 'PublicProfile',
      params: { profileId: 'profile-42' },
    })
  })

  it('closeProfile clears selectedProfileId and calls router.replace with previous URL', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/browse/social')
    const { closeProfile, selectedProfileId } = useFindMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')

    closeProfile()
    expect(selectedProfileId.value).toBeNull()
    expect(routerReplace).toHaveBeenCalledWith('/browse/social')
  })

  it('closeProfile falls back to browse scope when previousUrl is a profile URL', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/profile/other-id')
    mockLocalStore.getCurrentScope = 'dating'

    const { closeProfile } = useFindMatchViewModel()
    closeProfile()

    expect(routerReplace).toHaveBeenCalledWith({
      name: 'BrowseProfilesScope',
      params: { scope: 'dating' },
    })
  })

  it('route.fullPath watcher skips resolveScope when selectedProfileId is set', async () => {
    routeRef.value.params = { profileId: 'abc-123' }
    const vm = useFindMatchViewModel()

    // Change fullPath — should NOT trigger router.replace for scope resolution
    routerReplace.mockClear()
    routeRef.value = {
      ...routeRef.value,
      fullPath: '/profile/abc-123',
    }
    await nextTick()

    // Because selectedProfileId is set, resolveScope should be skipped.
    // The only replace calls should NOT be scope-related navigation.
    const scopeCalls = routerReplace.mock.calls.filter(
      (call) => call[0]?.name === 'BrowseProfilesScope'
    )
    expect(scopeCalls).toHaveLength(0)
  })

  it('currentScope watcher skips re-fetch when scope has not actually changed', async () => {
    routeRef.value.params = { scope: 'social' }
    useFindMatchViewModel()

    // The initial watch trigger may call fetchResults for 'social'
    mockFindProfileStore.findSocial.mockClear()

    // Set same scope again — should NOT trigger another fetch
    routeRef.value = {
      ...routeRef.value,
      params: { scope: 'social' },
      fullPath: '/browse/social?t=1',
    }
    await nextTick()

    expect(mockFindProfileStore.findSocial).not.toHaveBeenCalled()
  })
})
