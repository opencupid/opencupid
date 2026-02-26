import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// --- Mocks ---

const routerReplace = vi.fn()
const routerPush = vi.fn()

const routeRef = ref({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
  fullPath: '/matches',
})

vi.mock('vue-router', () => ({
  useRoute: () => routeRef.value,
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
}))

const mockGetPreviousUrl = vi.fn(() => '/matches')
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
  datingPrefs: null,
  findDating: vi.fn(),
  fetchDatingPrefs: vi.fn(),
  persistDatingPrefs: vi.fn(),
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

vi.mock('@/features/interaction/stores/useInteractionStore', () => ({
  useInteractionStore: () => ({
    sent: [],
    matches: [],
    newMatchesCount: 0,
    receivedLikesCount: 2,
    loading: false,
    initialized: true,
    sendLike: vi.fn(),
    passProfile: vi.fn(),
    fetchInteractions: vi.fn(),
    initialize: vi.fn(),
  }),
}))

import { useDatingMatchViewModel } from '../useDatingMatchViewModel'

describe('useDatingMatchViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeRef.value = {
      params: {},
      query: {},
      fullPath: '/matches',
    }
    mockGetPreviousUrl.mockReturnValue('/matches')
  })

  it('selectedProfileId starts null when no route param', () => {
    const { selectedProfileId } = useDatingMatchViewModel()
    expect(selectedProfileId.value).toBeNull()
  })

  it('selectedProfileId initializes from route param', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    const { selectedProfileId } = useDatingMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')
  })

  it('openProfile sets selectedProfileId and calls router.replace', () => {
    const { openProfile, selectedProfileId } = useDatingMatchViewModel()
    openProfile('profile-42')
    expect(selectedProfileId.value).toBe('profile-42')
    expect(routerReplace).toHaveBeenCalledWith({
      name: 'DatingMatch',
      params: { profileId: 'profile-42' },
    })
  })

  it('closeProfile clears selectedProfileId and navigates back', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/matches')
    const { closeProfile, selectedProfileId } = useDatingMatchViewModel()
    expect(selectedProfileId.value).toBe('abc-123')

    closeProfile()
    expect(selectedProfileId.value).toBeNull()
    expect(routerReplace).toHaveBeenCalledWith('/matches')
  })

  it('closeProfile navigates to DatingMatch when previousUrl is a profile URL', () => {
    routeRef.value.params = { profileId: 'abc-123' }
    mockGetPreviousUrl.mockReturnValue('/matches/other-id')

    const { closeProfile } = useDatingMatchViewModel()
    closeProfile()

    expect(routerReplace).toHaveBeenCalledWith({ name: 'DatingMatch' })
  })

  it('initialize fetches dating prefs and calls findDating', async () => {
    const vm = useDatingMatchViewModel()
    await vm.initialize()

    expect(mockFindProfileStore.fetchDatingPrefs).toHaveBeenCalled()
    expect(mockFindProfileStore.findDating).toHaveBeenCalled()
  })

  it('loadMoreProfiles calls loadMoreDating', async () => {
    const vm = useDatingMatchViewModel()
    await vm.loadMoreProfiles()
    expect(mockFindProfileStore.loadMoreDating).toHaveBeenCalled()
  })

  it('exposes interaction data', () => {
    const vm = useDatingMatchViewModel()
    expect(vm.receivedLikesCount.value).toBe(2)
    expect(vm.haveReceivedLikes.value).toBe(true)
  })
})
