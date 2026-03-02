import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const toastInfo = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: toastInfo }) }))

// stub child components
vi.mock('@/features/shared/components/MapView.vue', () => ({
  default: {
    template:
      '<div class="map-view"><div class="map-placeholder" /><div class="osm-poi-map" /></div>',
    props: ['items'],
  },
}))
vi.mock('../../components/ProfileMapCard.vue', () => ({
  default: { template: '<div class="profile-map-card" />' },
}))
vi.mock('@/features/shared/profileform/LocationSelector.vue', () => ({
  default: {
    template: '<div class="location-selector" />',
    props: ['modelValue', 'allowEmpty'],
  },
}))
vi.mock('@/features/shared/profileform/TagSelector.vue', () => ({
  default: {
    template: '<div class="tag-select-component" />',
    props: ['modelValue', 'taggable'],
  },
}))
vi.mock('@/features/shared/components/TagCloud.vue', () => ({
  default: { template: '<div class="tag-cloud" />' },
}))
vi.mock('@/assets/icons/interface/target-2.svg', () => ({
  default: { template: '<svg class="icon-target" />' },
}))
vi.mock('@/assets/icons/e-commerce/tag.svg', () => ({
  default: { template: '<svg class="icon-tag" />' },
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

const vmState = {
  viewerProfile: ref({ isSocialActive: true }),
  haveResults: ref(true),
  isLoading: ref(false),
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  socialFilter: ref<{
    location: { country: string; cityName: string; lat: null; lon: null }
    tags: { id: string; name: string; slug: string }[]
  } | null>(null),
  isInitialized: ref(true),
  hideProfile: vi.fn(),
  updatePrefs: vi.fn(),
  openProfile: vi.fn(),
  initialize: vi.fn(),
}

vi.mock('../../composables/useSocialMatchViewModel', () => ({
  useSocialMatchViewModel: () => vmState,
}))

const BModal = { template: '<div class="b-modal"><slot /></div>', props: ['modelValue'] }
const BButton = { template: '<button><slot /></button>' }
const BContainer = { template: '<div class="container"><slot /></div>' }

import SocialMatch from '../SocialMatch.vue'

describe('SocialMatch view', () => {
  beforeEach(() => {
    vmState.haveResults.value = true
    vmState.isInitialized.value = true
    vmState.socialFilter.value = null
    toastInfo.mockClear()
  })

  const mountComponent = () => {
    return mount(SocialMatch, {
      global: {
        stubs: {
          BModal,
          BButton,
          BContainer,
        },
      },
    })
  }

  it('shows map-placeholder while not initialized', () => {
    vmState.isInitialized.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.map-placeholder').exists()).toBe(true)
  })

  it('shows info toast when there are no results', async () => {
    vmState.haveResults.value = true
    mountComponent()
    vmState.haveResults.value = false
    await nextTick()
    expect(toastInfo).toHaveBeenCalledWith('profiles.browse.no_results_cta_title')
  })

  it('renders map view with OsmPoiMap', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
  })

  it('renders inline LocationSelector and TagSelector when filter is set', () => {
    vmState.socialFilter.value = {
      location: { country: 'US', cityName: 'New York', lat: null, lon: null },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.location-selector').exists()).toBe(true)
    expect(wrapper.find('.tag-select-component').exists()).toBe(true)
  })

  it('renders TagCloud modal markup', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.b-modal').exists()).toBe(true)
    expect(wrapper.find('.tag-cloud').exists()).toBe(true)
  })

  it('no detail overlay exists (profiles are now route-based)', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.detail-view').exists()).toBe(false)
    expect(wrapper.find('.public-profile').exists()).toBe(false)
  })
})
