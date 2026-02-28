import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// stub child components
vi.mock('../../components/MapPlaceholder.vue', () => ({
  default: { template: '<div class="map-placeholder" />', props: ['isAnimated'] },
}))
vi.mock('../../components/NoAccessCTA.vue', () => ({
  default: { template: '<div class="no-access" />', props: ['scope'] },
}))
vi.mock('../../components/NoResultsCTA.vue', () => ({
  default: { template: '<div class="no-results" />' },
}))
vi.mock('@/features/shared/components/OsmPoiMap.vue', () => ({
  default: { template: '<div class="osm-poi-map" />', props: ['items'] },
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
vi.mock('../../shared/composables/useCountries', () => ({
  useCountries: () => ({ countryCodeToName: vi.fn(() => 'Test Country') }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

const vmState = {
  viewerProfile: ref({ isSocialActive: true }),
  haveAccess: ref(true),
  haveResults: ref(true),
  isLoading: computed(
    (): boolean =>
      vmState.findProfileStoreLoading.value ||
      vmState.ownerStoreLoading.value ||
      !vmState.isInitialized.value
  ),
  findProfileStoreLoading: ref(false),
  ownerStoreLoading: ref(false),
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

const BPlaceholderWrapper = {
  props: ['loading'],
  template: `<div><slot v-if="!loading" /><slot name="loading" v-else /></div>`,
}
const BOverlay = { template: '<div class="b-overlay"><slot /><slot name="overlay" /></div>' }
const BModal = { template: '<div class="b-modal"><slot /></div>', props: ['modelValue'] }
const BButton = { template: '<button><slot /></button>' }
const BContainer = { template: '<div class="container"><slot /></div>' }

import SocialMatch from '../SocialMatch.vue'

describe('SocialMatch view', () => {
  beforeEach(() => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = true
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = true
    vmState.socialFilter.value = null
  })

  const mountComponent = () => {
    return mount(SocialMatch, {
      global: {
        stubs: {
          BPlaceholderWrapper,
          BOverlay,
          BModal,
          BButton,
          BContainer,
        },
      },
    })
  }

  it('displays placeholders while loading', () => {
    vmState.findProfileStoreLoading.value = true
    vmState.isInitialized.value = true
    const wrapper = mountComponent()
    expect(wrapper.find('.map-placeholder').exists()).toBe(true)
  })

  it('displays placeholders while initializing', () => {
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.map-placeholder').exists()).toBe(true)
  })

  it('shows no-access overlay when viewer lacks access', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.no-access').exists()).toBe(true)
  })

  it('shows no-results overlay when there are no results', () => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.no-results').exists()).toBe(true)
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
