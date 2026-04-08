import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, ref, computed } from 'vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const toastInfo = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: toastInfo }) }))

// stub child components
vi.mock('@/features/shared/components/osmPoiMap/OsmPoiMap.vue', () => ({
  default: {
    name: 'OsmPoiMap',
    template:
      '<div class="map-view"><div class="map-placeholder" /><div class="osm-poi-map" /></div>',
    props: ['items', 'clusters', 'iconResolver', 'center', 'popupComponent', 'fetchPopupData'],
  },
}))
vi.mock('../../components/ProfileMapCard.vue', () => ({
  default: { template: '<div class="profile-map-card" />' },
}))
vi.mock('@/features/app/composables/useDetailPanel', () => ({
  useDetailPanel: () => ({
    isOpen: ref(false),
    show: vi.fn(),
    close: vi.fn(),
  }),
}))
vi.mock('@/features/publicprofile/components/PublicProfileView.vue', () => ({
  default: { template: '<div class="public-profile-view" />', props: ['profileId'] },
}))
vi.mock('@/features/posts/components/PostMapPopup.vue', () => ({
  default: { template: '<div class="post-map-popup" />', props: ['item'] },
}))
vi.mock('@/features/posts/components/PostFullView.vue', () => ({
  default: { template: '<div class="post-full-view" />', props: ['post'] },
}))
vi.mock('@/features/browse/components/OwnerDrawerControls.vue', () => ({
  default: {
    template: '<div class="owner-drawer-controls" />',
    emits: ['open:inbox', 'open:profile'],
  },
}))
vi.mock('@/features/publicprofile/components/ProfileMarker.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/features/posts/components/PostMarker.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('../../components/BrowseFilterBar.vue', () => ({
  default: {
    name: 'BrowseFilterBar',
    template: '<div class="browse-filter-bar" />',
    props: ['modelValue', 'viewerProfile', 'availableTags', 'selectedTagIds'],
    emits: ['filter:changed', 'update:selectedTagIds', 'update:modelValue'],
  },
}))
vi.mock('@/assets/icons/interface/target-2.svg', () => ({
  default: { template: '<svg class="icon-target" />' },
}))

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRouteName = ref('Browse')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: mockReplace }),
  useRoute: () => ({
    get name() {
      return mockRouteName.value
    },
    query: {},
  }),
}))

// Stub OwnerDrawerOrchestrator to avoid media-encoder-host Worker dependency
vi.mock('@/features/app/components/OwnerDrawerOrchestrator.vue', () => ({
  default: { template: '<div class="owner-drawer-stub" />' },
}))
vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('@/features/app/composables/useNotificationState', () => ({
  useNotificationState: () => ({
    hasUnreadMessages: ref(false),
    hasMatchNotifications: ref(false),
  }),
}))
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    profile: { publicName: 'Test', profileImages: [] },
  }),
}))
vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<svg class="icon-message" />' },
}))
vi.mock('@/assets/icons/interface/user.svg', () => ({
  default: { template: '<svg class="icon-user" />' },
}))

// Control detail state via a ref so tests can set it
const mockDetail = ref<{ type: 'profile' | 'post'; id: string } | null>(null)

vi.mock('@/features/shared/composables/useDetailRouteState', () => ({
  useDetailRouteState: () => ({ detail: computed(() => mockDetail.value) }),
}))

const vmState = {
  viewerProfile: ref<Record<string, any>>({ isSocialActive: true }),
  isNoOneAround: ref(true),
  isLoading: ref(false),
  clusterFeatures: ref([
    {
      type: 'point',
      id: 'p1',
      lat: 47,
      lon: 19,
      publicName: 'Alice',
      image: null,
      highlighted: false,
    },
  ]),
  storeError: ref(null),
  matchFilter: ref<{
    location: { country: string; cityName: string; lat: number | null; lon: number | null }
    tags: { id: string; name: string; slug: string }[]
  } | null>(null),
  isInitialized: ref(true),
  hideProfile: vi.fn(),
  onBoundsChanged: vi.fn(),
  updatePrefs: vi.fn(),
  openProfile: vi.fn(),
  initialize: vi.fn(),
  refreshIfFilterChanged: vi.fn(),
  mapCenter: ref(null),
  fetchPopupData: vi.fn(),
}

vi.mock('../../composables/useProfilesViewModel', () => ({
  useProfilesViewModel: () => vmState,
}))

vi.mock('@/features/browse/stores/findProfileStore', () => ({
  useFindProfileStore: () => ({
    fetchProfileForPopup: vi.fn(),
  }),
}))

const BButton = { template: '<button><slot /></button>' }
const BContainer = { template: '<div class="container"><slot /></div>' }
const NoResultsCTA = { template: '<div class="no-results-cta" />' }

import BrowseProfiles from '../BrowseProfiles.vue'

describe('BrowseProfiles view', () => {
  beforeEach(() => {
    vmState.isNoOneAround.value = false
    vmState.isInitialized.value = true
    vmState.matchFilter.value = null
    mockRouteName.value = 'Browse'
    mockDetail.value = null
    toastInfo.mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  const mountComponent = () => {
    return mount(BrowseProfiles, {
      global: {
        stubs: {
          BButton,
          BContainer,
          NoResultsCTA,
          NotificationDot: { template: '<span><slot /></span>' },
          ProfileImage: true,
          Teleport: true,
        },
        mocks: { $t: (k: string) => k },
      },
    })
  }

  it('shows map-placeholder while not initialized', () => {
    vmState.isInitialized.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.map-placeholder').exists()).toBe(true)
  })

  it('does not show toast when there are no results (replaced by inline CTA)', async () => {
    vmState.isNoOneAround.value = false
    mountComponent()
    vmState.isNoOneAround.value = true
    await nextTick()
    expect(toastInfo).not.toHaveBeenCalled()
  })

  it('hides CTA alert when isNoOneAround is false (other profiles present)', () => {
    vmState.isNoOneAround.value = false
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'BAlert' }).exists()).toBe(false)
  })

  it('shows CTA alert when isNoOneAround is true (no other profiles)', () => {
    vmState.isNoOneAround.value = true
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'BAlert' }).exists()).toBe(true)
  })

  it('renders map view with OsmPoiMap', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
  })

  it('renders BrowseFilterBar', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.browse-filter-bar').exists()).toBe(true)
  })

  it('renders map when matchFilter has location coords', () => {
    vmState.matchFilter.value = {
      location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.map-view').exists()).toBe(true)
  })

  it('renders map when matchFilter has null coords but profile has location', () => {
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
    }
    vmState.matchFilter.value = {
      location: { country: '', cityName: '', lat: null, lon: null },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.map-view').exists()).toBe(true)
  })

  it('renders map when neither filter nor profile has coords', () => {
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: '', cityName: '', lat: null, lon: null },
    }
    vmState.matchFilter.value = {
      location: { country: '', cityName: '', lat: null, lon: null },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.map-view').exists()).toBe(true)
  })
})
