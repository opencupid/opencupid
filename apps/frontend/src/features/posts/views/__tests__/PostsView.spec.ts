import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { template: '<i />', props: ['icon'] },
}))
vi.mock('@/features/shared/components/OsmPoiMap.vue', () => ({
  default: { template: '<div class="osm-poi-map" />', props: ['items', 'getLocation', 'getTitle', 'popupComponent'] },
}))
vi.mock('../../components/PostList.vue', () => ({
  default: {
    template: '<div class="post-list" />',
    props: ['scope', 'isActive', 'type', 'nearbyParams', 'showFilters', 'emptyMessage'],
  },
}))
vi.mock('../../components/PostEdit.vue', () => ({
  default: { template: '<div class="post-edit" />', props: ['post', 'isEdit'] },
}))
vi.mock('../../components/PostFullView.vue', () => ({
  default: { template: '<div class="post-full-view" />', props: ['post'] },
}))
vi.mock('../../components/PostMapCard.vue', () => ({
  default: { template: '<div class="post-map-card" />' },
}))
vi.mock('@/features/shared/ui/ViewModeToggler.vue', () => ({
  default: { template: '<div class="view-mode-toggler" />', props: ['modelValue'] },
}))
vi.mock('../../stores/postStore', () => ({
  usePostStore: () => ({ posts: ref([]), myPosts: ref([]) }),
}))

const vmState = {
  activeTab: ref<'all' | 'nearby' | 'recent' | 'my'>('all'),
  viewMode: ref<'grid' | 'map'>('grid'),
  showCreateModal: ref(false),
  locationPermission: ref(true),
  nearbyParams: ref(null),
  isDetailView: ref(false),
  showFullView: ref(false),
  editingPost: ref(null),
  selectedPost: ref(null),
  ownerProfile: ref(null),
  initialize: vi.fn(),
  requestLocation: vi.fn(),
  handlePostListIntent: vi.fn(),
}

vi.mock('../../composables/usePostsViewModel', () => ({
  usePostsViewModel: () => vmState,
}))

const BModal = {
  template: '<div class="b-modal"><slot /></div>',
  props: ['show', 'title', 'modelValue', 'backdrop', 'centered', 'size', 'buttonSize', 'fullscreen', 'focus', 'noHeader', 'noFooter', 'noCloseOnEsc', 'bodyClass', 'keyboard'],
}
const BButton = { template: '<button><slot /></button>' }
const BFormSelect = { template: '<select><slot /></select>', props: ['modelValue', 'size'] }

import PostsView from '../Posts.vue'

describe('Posts view', () => {
  beforeEach(() => {
    vmState.activeTab.value = 'all'
    vmState.viewMode.value = 'grid'
    vmState.showFullView.value = false
    vmState.editingPost.value = null
    vmState.selectedPost.value = null
    vmState.locationPermission.value = true
  })

  const mountComponent = () =>
    mount(PostsView, {
      global: {
        stubs: { BModal, BButton, BFormSelect },
        mocks: { $t: (k: string) => k },
      },
    })

  it('renders the posts toolbar', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.posts-toolbar').exists()).toBe(true)
  })

  it('shows PostList in grid mode', () => {
    vmState.viewMode.value = 'grid'
    const wrapper = mountComponent()
    expect(wrapper.find('.post-list').exists()).toBe(true)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(false)
  })

  it('shows OsmPoiMap in map mode', () => {
    vmState.viewMode.value = 'map'
    const wrapper = mountComponent()
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
    expect(wrapper.find('.post-list').exists()).toBe(false)
  })

  describe('map mode layout', () => {
    it('adds map-mode class to list-view in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.list-view').classes()).toContain('map-mode')
    })

    it('does not add map-mode class in grid mode', () => {
      vmState.viewMode.value = 'grid'
      const wrapper = mountComponent()
      expect(wrapper.find('.list-view').classes()).not.toContain('map-mode')
    })

    it('renders exactly one OsmPoiMap with map-fullscreen class in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.findAll('.osm-poi-map').length).toBe(1)
      expect(wrapper.find('.map-fullscreen').exists()).toBe(true)
    })

    it('hides tab-content in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.tab-content').exists()).toBe(false)
    })

    it('toolbar is present in map mode', () => {
      vmState.viewMode.value = 'map'
      const wrapper = mountComponent()
      expect(wrapper.find('.posts-toolbar').exists()).toBe(true)
    })
  })
})
