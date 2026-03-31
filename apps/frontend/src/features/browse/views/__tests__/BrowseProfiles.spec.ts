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
vi.mock('@/features/shared/profileform/TagFilterSelector.vue', () => ({
  default: {
    template: '<div class="tag-filter-selector" />',
    props: ['modelValue'],
  },
}))
vi.mock('@/assets/icons/interface/target-2.svg', () => ({
  default: { template: '<svg class="icon-target" />' },
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

const vmState = {
  viewerProfile: ref<Record<string, any>>({ isSocialActive: true }),
  isNoOneAround: ref(true),
  isLoading: ref(false),
  mapClusters: ref([] as any[]),
  mapProfiles: ref([] as any[]),
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
}

vi.mock('../../composables/useSocialMatchViewModel', () => ({
  useSocialMatchViewModel: () => vmState,
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
    toastInfo.mockClear()
  })

  const mountComponent = () => {
    return mount(BrowseProfiles, {
      global: {
        stubs: {
          BButton,
          BContainer,
          NoResultsCTA,
        },
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

  it('renders inline LocationSelector and TagSelector when filter is set', () => {
    vmState.matchFilter.value = {
      location: { country: 'US', cityName: 'New York', lat: null, lon: null },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.location-selector').exists()).toBe(true)
    expect(wrapper.find('.tag-filter-selector').exists()).toBe(true)
  })

  it('renders TagFilterSelector in filter bar', () => {
    vmState.matchFilter.value = {
      location: { country: 'US', cityName: 'New York', lat: null, lon: null },
      tags: [],
    }
    const wrapper = mountComponent()
    expect(wrapper.find('.tag-filter-selector').exists()).toBe(true)
  })

  it('no detail overlay exists (profiles are now route-based)', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.detail-view').exists()).toBe(false)
    expect(wrapper.find('.public-profile').exists()).toBe(false)
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
