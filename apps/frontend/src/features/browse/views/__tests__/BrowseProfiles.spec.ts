import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, ref, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const toastInfo = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: toastInfo }) }))

// stub child components
vi.mock('@/features/map/components/OsmPoiMap.vue', () => ({
  default: {
    name: 'OsmPoiMap',
    template: '<div class="map-view"><div class="osm-poi-map" /></div>',
    props: [
      'items',
      'clusters',
      'iconResolver',
      'initialCenter',
      'highlightedLocation',
      'popupResolver',
      'fetchPopupData',
    ],
    emits: ['map:ready', 'item:select', 'bounds:changed'],
  },
}))
vi.mock('@/features/shared/components/MapPlaceholder.vue', () => ({
  default: {
    name: 'MapPlaceholder',
    template: '<div class="map-placeholder-stub" />',
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
vi.mock('../../components/NearbyFeatures.vue', () => ({
  default: {
    name: 'NearbyFeatures',
    template: '<div class="nearby-features-stub" />',
    props: ['items'],
    emits: ['item:select'],
  },
}))
vi.mock('@/features/publicprofile/components/profileMarkerIcon', () => ({
  renderProfileMarkerHtml: () => '<div />',
}))
vi.mock('@/features/posts/components/postMapIcon', () => ({
  renderPostMapIconHtml: () => '<div />',
}))
vi.mock('@/features/posts/components/PostMarker.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('../../components/SearchBar.vue', () => ({
  default: {
    name: 'SearchBar',
    template: '<div class="search-bar" />',
    props: ['viewerProfile', 'availableTags'],
    emits: ['location:set'],
  },
}))

vi.mock('@/features/map/components/MapLayerControl.vue', () => ({
  default: { name: 'MapLayerControl', template: '<div class="map-layer-control-stub" />' },
}))

vi.mock('@/features/browse/stores/searchStore', () => ({
  useSearchStore: () => ({
    selectedTagIds: ref<string[]>([]),
    toggleTag: vi.fn(),
    setTags: vi.fn(),
    clearTags: vi.fn(),
    reset: vi.fn(),
  }),
}))

// Shared VM state that tests can mutate
const vmState = {
  viewerProfile: ref<Record<string, any>>({
    isSocialActive: true,
    location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
  }),
  isNoOneAround: ref(false),
  isLoading: ref(false),
  haveResults: ref(true),
  clusters: ref([]),
  allPois: ref([]),
  profilePois: ref([]),
  availableTags: ref([]),
  activePoi: ref(null),
  onSelectionClear: vi.fn(),
  onBoundsChanged: vi.fn(),
  fetchPopupData: vi.fn(),
}

vi.mock('../../composables/useBrowseViewModel', () => ({
  useBrowseViewModel: () => vmState,
}))

// findProfileStore is real (so storeToRefs works); spies attach in beforeEach.
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
let mockRefetchBounds: ReturnType<typeof vi.spyOn>

const mockFeedItems = ref<any[]>([])
vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({
    fetchPublicPost: vi.fn().mockResolvedValue({ success: false }),
    fetchPublicEvent: vi.fn().mockResolvedValue({ success: false }),
    fetchPublicCommunity: vi.fn().mockResolvedValue({ success: false }),
    get feedItems() {
      return mockFeedItems.value
    },
  }),
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

const mockDetail = ref<{ type: 'profile' | 'post'; id: string } | null>(null)

vi.mock('@/features/shared/composables/useDetailRouteState', () => ({
  useDetailRouteState: () => ({ detail: computed(() => mockDetail.value) }),
}))

const BButton = { template: '<button><slot /></button>' }
const BContainer = { template: '<div class="container"><slot /></div>' }
const InviteCtaShareDialog = {
  template: '<div class="share-dialog"><slot /></div>',
  props: ['trigger', 'payload'],
}

import BrowseProfiles from '../BrowseProfiles.vue'
import { MAP_DEFAULT_CENTER } from '@shared/maps'

describe('BrowseProfiles view', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const findProfileStore = useFindProfileStore()
    mockRefetchBounds = vi.spyOn(findProfileStore, 'refetchBounds').mockResolvedValue(undefined)
    vi.spyOn(findProfileStore, 'fetchBounds').mockResolvedValue(undefined)
    vmState.isNoOneAround.value = false
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
    }
    mockRouteName.value = 'Browse'
    mockDetail.value = null
    mockFeedItems.value = []
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
          InviteCtaShareDialog,
          NotificationDot: { template: '<span><slot /></span>' },
          ProfileImage: true,
          Teleport: true,
        },
        mocks: { $t: (k: string) => k },
      },
    })
  }

  it('does not show toast when there are no results (replaced by inline CTA)', async () => {
    vmState.isNoOneAround.value = false
    mountComponent()
    vmState.isNoOneAround.value = true
    await nextTick()
    expect(toastInfo).not.toHaveBeenCalled()
  })

  it('passes trigger=false to InviteCtaShareDialog when isNoOneAround is false', () => {
    vmState.isNoOneAround.value = false
    const wrapper = mountComponent()
    expect(wrapper.findComponent(InviteCtaShareDialog).props('trigger')).toBe(false)
  })

  it('passes trigger=true to InviteCtaShareDialog when isNoOneAround is true', () => {
    vmState.isNoOneAround.value = true
    const wrapper = mountComponent()
    expect(wrapper.findComponent(InviteCtaShareDialog).props('trigger')).toBe(true)
  })

  it('renders map view with OsmPoiMap', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
  })

  it('renders SearchBar', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.search-bar').exists()).toBe(true)
  })

  it('renders map when viewer profile has location coords', () => {
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.map-view').exists()).toBe(true)
    const map = wrapper.findComponent({ name: 'OsmPoiMap' })
    expect(map.props('initialCenter')).toEqual([47.5, 19.0])
  })

  it('mounts the map with MAP_DEFAULT_CENTER when viewer profile lacks lat/lon', () => {
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
    }
    const wrapper = mountComponent()
    const map = wrapper.findComponent({ name: 'OsmPoiMap' })
    expect(map.exists()).toBe(true)
    expect(map.props('initialCenter')).toEqual(MAP_DEFAULT_CENTER)
  })

  it('does not mount the map until viewerProfile has loaded', () => {
    vmState.viewerProfile.value = null as unknown as Record<string, any>
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'OsmPoiMap' }).exists()).toBe(false)
  })

  it('shows MapPlaceholder and hides it after OsmPoiMap emits map:ready', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.map-placeholder-stub').exists()).toBe(true)

    wrapper.findComponent({ name: 'OsmPoiMap' }).vm.$emit('map:ready', {})
    await nextTick()

    expect(wrapper.find('.map-placeholder-stub').exists()).toBe(false)
  })

  it('passes contentStore.feedItems to NearbyFeatures', () => {
    mockFeedItems.value = [
      {
        id: 'post-1',
        kind: 'post',
        content: 'Test post',
        location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
        postedBy: { id: 'p1', publicName: 'Author', profileImages: [] } as any,
        createdAt: new Date(),
        isOwn: false,
      },
    ]
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    expect(nearby.exists()).toBe(true)
    expect(nearby.props('items')).toHaveLength(1)
    expect(nearby.props('items')[0].id).toBe('post-1')
  })

  it('navigates to post route when NearbyFeatures emits item:select with kind=post', async () => {
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    nearby.vm.$emit('item:select', { id: 'post-42', kind: 'post' })
    await nextTick()
    expect(mockPush).toHaveBeenCalledWith({
      name: 'PublicPost',
      params: { postId: 'post-42' },
    })
  })

  it('navigates by kind when an item is selected from NearbyFeatures', async () => {
    mockFeedItems.value = [
      {
        id: 'e1',
        kind: 'event',
        content: 'a',
        postedBy: { id: 'p', publicName: 'P', profileImages: [] } as any,
        createdAt: new Date(),
        isOwn: false,
      },
    ]
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    await nearby.vm.$emit('item:select', mockFeedItems.value[0])
    expect(mockPush).toHaveBeenCalledWith({ name: 'PublicEvent', params: { eventId: 'e1' } })
  })

  it('navigates to community route when NearbyFeatures emits item:select with kind=community', async () => {
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    await nearby.vm.$emit('item:select', {
      id: 'c1',
      kind: 'community',
      content: 'a',
      postedBy: { id: 'p', publicName: 'P', profileImages: [] } as any,
      createdAt: new Date(),
      isOwn: false,
    })
    expect(mockPush).toHaveBeenCalledWith({
      name: 'PublicCommunity',
      params: { communityId: 'c1' },
    })
  })

  it('recenters the map (highlightedLocation) when an item with a valid location is selected', async () => {
    const wrapper = mountComponent()
    const nearby = wrapper.findComponent({ name: 'NearbyFeatures' })
    await nearby.vm.$emit('item:select', {
      id: 'e1',
      kind: 'event',
      content: 'a',
      postedBy: { id: 'p', publicName: 'P', profileImages: [] } as any,
      createdAt: new Date(),
      isOwn: false,
      location: { lat: 51.5, lon: -0.1, country: 'GB', cityName: 'London' } as any,
    })
    await nextTick()
    const map = wrapper.findComponent({ name: 'OsmPoiMap' })
    expect(map.props('highlightedLocation')).toEqual([51.5, -0.1])
  })

  it('refetches bounds when findProfileStore.selectedLayers changes', async () => {
    mountComponent()
    await flushPromises()

    const findProfileStore = useFindProfileStore()
    mockRefetchBounds.mockClear()
    findProfileStore.selectedLayers = ['post']
    await nextTick()

    expect(mockRefetchBounds).toHaveBeenCalledTimes(1)
  })
})
