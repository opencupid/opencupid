import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// stub child components
vi.mock('../../components/ProfileCardGrid.vue', () => ({
  default: { template: '<div class="profile-grid" />', props: ['profiles'] },
}))
vi.mock('../../components/PlaceholdersGrid.vue', () => ({
  default: { template: '<div class="placeholders-grid" />', props: ['howMany', 'loading'] },
}))
vi.mock('../../components/NoAccessCTA.vue', () => ({
  default: { template: '<div class="no-access" />', props: ['scope'] },
}))
vi.mock('../../components/NoResultsCTA.vue', () => ({
  default: { template: '<div class="no-results" />' },
}))
vi.mock('../../components/SocialFilterForm.vue', () => ({
  default: {
    template: '<div class="social-filter-form" />',
    props: ['modelValue', 'viewerProfile'],
  },
}))
vi.mock('../../components/SocialFilterDisplay.vue', () => ({
  default: {
    template: '<div class="social-filter-display" />',
    props: ['modelValue', 'viewerLocation'],
  },
}))
vi.mock('@/features/publicprofile/components/PublicProfile.vue', () => ({
  default: { template: '<div class="public-profile" />', props: ['id'] },
}))
vi.mock('@/features/shared/components/OsmPoiMap.vue', () => ({
  default: { template: '<div class="osm-poi-map" />', props: ['items'] },
}))
vi.mock('@/features/shared/ui/ViewModeToggler.vue', () => ({
  default: { template: '<div class="view-mode-toggler" />', props: ['modelValue'] },
}))
vi.mock('../../components/ProfileMapCard.vue', () => ({
  default: { template: '<div class="profile-map-card" />' },
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
  viewModeModel: ref('grid'),
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  socialFilter: ref<{ location: { country: string }; radius: number } | null>(null),
  selectedProfileId: ref<string | null>(null),
  isInitialized: ref(true),
  isLoadingMore: ref(false),
  hideProfile: vi.fn(),
  updatePrefs: vi.fn(),
  openProfile: vi.fn(),
  closeProfile: vi.fn(),
  hasMoreProfiles: ref(true),
  initialize: vi.fn(),
  reset: vi.fn(),
  loadMoreProfiles: vi.fn(),
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
const BSpinner = { template: '<div class="spinner" />', props: ['variant', 'small'] }

import SocialMatch from '../SocialMatch.vue'

describe('SocialMatch view', () => {
  beforeEach(() => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = true
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = true
    vmState.selectedProfileId.value = null
    vmState.isLoadingMore.value = false
    vmState.hasMoreProfiles.value = true
    vmState.viewModeModel.value = 'grid'
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
          BSpinner,
        },
      },
    })
  }

  it('displays placeholders while loading', () => {
    vmState.findProfileStoreLoading.value = true
    vmState.isInitialized.value = true
    const wrapper = mountComponent()
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
  })

  it('displays placeholders while initializing', () => {
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
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

  it('renders profile grid when in grid view mode', () => {
    vmState.viewModeModel.value = 'grid'
    const wrapper = mountComponent()
    expect(wrapper.find('.profile-grid').exists()).toBe(true)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(false)
  })

  it('renders map when in map view mode', () => {
    vmState.viewModeModel.value = 'map'
    const wrapper = mountComponent()
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
  })

  it('shows social filter display when access is granted', () => {
    vmState.socialFilter.value = { location: { country: 'US' }, radius: 50 }
    const wrapper = mountComponent()
    expect(wrapper.find('.social-filter-display').exists()).toBe(true)
  })

  describe('ViewMode - Detail View', () => {
    it('displays detail view when a profile is selected', () => {
      vmState.selectedProfileId.value = 'profile-123'
      const wrapper = mountComponent()
      expect(wrapper.find('.detail-view').exists()).toBe(true)
      expect(wrapper.find('.list-view').classes()).toContain('inactive')
    })

    it('shows public profile component in detail view', () => {
      vmState.selectedProfileId.value = 'profile-123'
      const wrapper = mountComponent()
      expect(wrapper.find('.public-profile').exists()).toBe(true)
    })

    it('transitions from grid to detail view', async () => {
      vmState.selectedProfileId.value = null
      const wrapper = mountComponent()

      expect(wrapper.find('.list-view').classes()).not.toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(false)

      vmState.selectedProfileId.value = 'profile-456'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.list-view').classes()).toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(true)
    })
  })
})
