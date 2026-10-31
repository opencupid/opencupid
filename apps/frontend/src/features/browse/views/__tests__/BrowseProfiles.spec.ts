import { mount } from '@vue/test-utils'
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
      'focusBounds',
      'emphasizedPoiId',
      'pulsePoi',
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

const mockToggleTag = vi.fn()
const mockSetTags = vi.fn()
vi.mock('@/features/browse/stores/searchStore', () => ({
  useSearchStore: () => ({
    selectedTags: ref([]),
    selectedTagIds: ref<string[]>([]),
    toggleTag: mockToggleTag,
    setTags: mockSetTags,
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
const mockBack = vi.fn()
const mockRouteName = ref('Browse')

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    resolve: () => ({ fullPath: '/browse' }),
  }),
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
const mockGridOpen = ref(false)

vi.mock('@/features/shared/composables/useDetailRouteState', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/shared/composables/useDetailRouteState')>()),
  useDetailRouteState: () => ({
    detail: computed(() => mockDetail.value),
    isGridOpen: computed(() => mockGridOpen.value),
  }),
}))

const mockIsMdUp = ref(false)
vi.mock('@/lib/responsive', () => ({
  get isMdUp() {
    return mockIsMdUp
  },
}))

const gridStoreMock = {
  items: [],
  total: 0,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  load: vi.fn(),
  loadMore: vi.fn(),
}
const mockAreaName = ref<string | null>(null)
const mockUseAreaName = vi.fn()
vi.mock('@/features/geocoding/composables/useAreaName', () => ({
  useAreaName: (...args: unknown[]) => {
    mockUseAreaName(...args)
    return { name: mockAreaName }
  },
}))

const mockUseGridUrlSync = vi.fn()
vi.mock('../../composables/useGridUrlSync', () => ({
  useGridUrlSync: (opts: unknown) => mockUseGridUrlSync(opts),
}))

vi.mock('@/features/browse/stores/browseGridStore', () => ({
  useBrowseGridStore: () => gridStoreMock,
}))
vi.mock('../../components/BrowseGridChip.vue', () => ({
  default: {
    name: 'BrowseGridChip',
    template: '<button class="grid-chip-stub" @click="$emit(\'open\')" />',
    props: ['count', 'loading'],
    emits: ['open'],
  },
}))
vi.mock('../../components/BrowseGridPanel.vue', () => ({
  default: {
    name: 'BrowseGridPanel',
    template: '<div class="grid-panel-stub" />',
    props: [
      'areaName',
      'items',
      'total',
      'hasMore',
      'isLoading',
      'isLoadingMore',
      'selectedTags',
      'availableTags',
      'sharePayload',
      'kinds',
    ],
    emits: [
      'close',
      'place:select',
      'select',
      'locate',
      'hover',
      'tag:add',
      'tag:remove',
      'load-more',
      'update:kinds',
    ],
  },
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
    vi.spyOn(findProfileStore, 'refetchBounds').mockResolvedValue(undefined)
    vi.spyOn(findProfileStore, 'fetchBounds').mockResolvedValue(undefined)
    vmState.isNoOneAround.value = false
    vmState.viewerProfile.value = {
      isSocialActive: true,
      location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
    }
    mockRouteName.value = 'Browse'
    mockDetail.value = null
    mockGridOpen.value = false
    mockAreaName.value = null
    mockIsMdUp.value = false
    gridStoreMock.load.mockClear()
    mockToggleTag.mockClear()
    mockBack.mockClear()
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
  describe('browse grid', () => {
    const bounds = { south: 47, north: 48, west: 18.5, east: 19.5 }
    const profileItem = {
      kind: 'profile',
      distanceKm: 1.2,
      profile: { id: 'p1', location: { country: 'HU', lat: 47.6, lon: 19.1 } },
    }

    it('shows the grid button with the number of map items in view', async () => {
      const store = useFindProfileStore()
      store.lastMapBounds = bounds
      store.clusterFeatures = [
        { type: 'cluster', id: 1, lat: 47.5, lon: 19, count: 4, expansionZoom: 9 },
        {
          type: 'point',
          kind: 'profile',
          id: 'x',
          lat: 47.2,
          lon: 19,
          publicName: 'X',
          image: null,
          highlighted: false,
        },
        {
          type: 'point',
          kind: 'profile',
          id: 'y',
          lat: 46,
          lon: 19,
          publicName: 'Y',
          image: null,
          highlighted: false,
        },
      ] as any
      const wrapper = mountComponent()
      await nextTick()

      expect(wrapper.findComponent({ name: 'BrowseGridChip' }).props('count')).toBe(5)
    })

    it('opens the grid route from the grid button', async () => {
      const wrapper = mountComponent()
      await wrapper.find('.grid-chip-stub').trigger('click')

      expect(mockPush).toHaveBeenCalledWith({ name: 'BrowseGrid' })
    })

    it('shows the grid panel instead of the button and nearby strip on the grid route', () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()

      expect(wrapper.find('.grid-panel-stub').exists()).toBe(true)
      expect(wrapper.find('.grid-chip-stub').exists()).toBe(false)
      expect(wrapper.find('.nearby-features-stub').exists()).toBe(false)
    })

    it('loads the grid for the current map bounds and filters while open', async () => {
      mockGridOpen.value = true
      useFindProfileStore().lastMapBounds = bounds
      mountComponent()
      await nextTick()

      expect(gridStoreMock.load).toHaveBeenCalledWith({
        bounds,
        tagIds: [],
        kinds: ['profile', 'post', 'event', 'community'],
      })
    })

    it('does not load the grid while it is closed', async () => {
      useFindProfileStore().lastMapBounds = bounds
      mountComponent()
      await nextTick()

      expect(gridStoreMock.load).not.toHaveBeenCalled()
    })

    it('opens a selected grid item as a detail over the grid', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('select', profileItem)

      expect(mockPush).toHaveBeenCalledWith({ name: 'GridProfile', params: { profileId: 'p1' } })
    })

    it('opens map selections over the grid while the grid is open', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'SearchBar' }).vm.$emit('profile:select', { id: 'p9' })

      expect(mockPush).toHaveBeenCalledWith({ name: 'GridProfile', params: { profileId: 'p9' } })
    })

    it('on phones, "show on map" centres the item and closes the grid', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('locate', profileItem)
      await nextTick()

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('highlightedLocation')).toEqual([
        47.6, 19.1,
      ])
      expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
    })

    it('on desktop, "show on map" centres the item and keeps the grid open', async () => {
      mockGridOpen.value = true
      mockIsMdUp.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('locate', profileItem)
      await nextTick()

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('highlightedLocation')).toEqual([
        47.6, 19.1,
      ])
      expect(mockReplace).not.toHaveBeenCalled()
      expect(mockBack).not.toHaveBeenCalled()
    })

    it('steps back to the map when the grid was opened from it', async () => {
      mockGridOpen.value = true
      window.history.replaceState({ back: '/browse' }, '')
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('close')

      expect(mockBack).toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
      window.history.replaceState(null, '')
    })

    it('replaces a deep-linked grid with the map on close', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('close')

      expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
    })

    it('names the area from the map bounds while the grid is open', async () => {
      mockGridOpen.value = true
      mockAreaName.value = 'Szentendre'
      const wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'BrowseGridPanel' }).props('areaName')).toBe(
        'Szentendre'
      )
      const [boundsRef, enabledRef] = mockUseAreaName.mock.calls.at(-1)! as any[]
      expect(enabledRef.value).toBe(true)
      expect(boundsRef.value).toBeNull()
    })

    it('fits the map to a picked place that has an extent', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      const bounds = { south: 47.35, north: 47.61, west: 18.93, east: 19.33 }
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('place:select', {
        name: 'Budapest',
        country: 'HU',
        lat: 47.5,
        lon: 19.04,
        bounds,
      })
      await nextTick()

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('focusBounds')).toEqual(bounds)
    })

    it('flies to a picked place without an extent', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper
        .findComponent({ name: 'BrowseGridPanel' })
        .vm.$emit('place:select', { name: 'Pomáz', country: 'HU', lat: 47.64, lon: 19.02 })
      await nextTick()

      const map = wrapper.findComponent({ name: 'OsmPoiMap' })
      expect(map.props('highlightedLocation')).toEqual([47.64, 19.02])
      expect(map.props('focusBounds')).toBeNull()
    })

    it('on desktop, hovering a card emphasises its pin until the pointer leaves', async () => {
      mockGridOpen.value = true
      mockIsMdUp.value = true
      const wrapper = mountComponent()
      const panel = wrapper.findComponent({ name: 'BrowseGridPanel' })
      const map = () => wrapper.findComponent({ name: 'OsmPoiMap' })

      await panel.vm.$emit('hover', profileItem)
      expect(map().props('emphasizedPoiId')).toBe('p1')

      await panel.vm.$emit('hover', null)
      expect(map().props('emphasizedPoiId')).toBeNull()
    })

    it('on phones, card hover does not emphasise pins', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('hover', profileItem)

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('emphasizedPoiId')).toBeNull()
    })

    it('clears the emphasis when the grid closes', async () => {
      mockGridOpen.value = true
      mockIsMdUp.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('hover', profileItem)

      mockGridOpen.value = false
      await nextTick()

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('emphasizedPoiId')).toBeNull()
    })

    it('"show on map" pulses the item\'s pin', async () => {
      mockGridOpen.value = true
      mockIsMdUp.value = true
      const wrapper = mountComponent()
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('locate', profileItem)
      await nextTick()

      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('pulsePoi')).toEqual({ id: 'p1' })
    })

    it('syncs the grid URL with the map bounds and shared tags', async () => {
      const wrapper = mountComponent()
      const opts = mockUseGridUrlSync.mock.calls.at(-1)![0]
      const tag = { id: 't1', name: 'hiking', slug: 'hiking' }

      opts.setTags([tag])
      expect(mockSetTags).toHaveBeenCalledWith([tag])

      const bounds = { south: 47.35, north: 47.61, west: 18.93, east: 19.33 }
      opts.fitBounds(bounds)
      await nextTick()
      expect(wrapper.findComponent({ name: 'OsmPoiMap' }).props('focusBounds')).toEqual(bounds)
    })

    it('toggles tags in the shared search filter', async () => {
      mockGridOpen.value = true
      const wrapper = mountComponent()
      const tag = { id: 't1', name: 'hiking', slug: 'hiking' }
      await wrapper.findComponent({ name: 'BrowseGridPanel' }).vm.$emit('tag:remove', tag)

      expect(mockToggleTag).toHaveBeenCalledWith(tag)
    })
  })
})
