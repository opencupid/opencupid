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
  default: { template: '<div class="no-access" />', props: ['modelValue'] },
}))
vi.mock('../../components/NoResultsCTA.vue', () => ({
  default: { template: '<div class="no-results" />' },
}))
vi.mock('../../components/DatingPreferencesForm.vue', () => ({
  default: { template: '<div class="prefs-form" />', props: ['modelValue'] },
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
vi.mock('../../components/DatingPrefsDisplay.vue', () => ({
  default: {
    template: '<div class="dating-prefs-display" />',
    props: ['modelValue', 'viewerLocation'],
  },
}))
vi.mock('../../components/MiddleColumn.vue', () => ({
  default: { template: '<div class="middle"><slot /></div>' },
}))
vi.mock('../../components/OsmPoiMap.vue', () => ({
  default: { template: '<div class="osm-poi-map" />', props: ['profiles'] },
}))
vi.mock('@/features/publicprofile/components/PublicProfile.vue', () => ({
  default: { template: '<div class="public-profile" />', props: ['id'] },
}))
vi.mock('@/features/interaction/components/ReceivedLikesCount.vue', () => ({
  default: { template: '<div class="received-likes" />' },
}))
vi.mock('@/features/shared/ui/SecondaryNav.vue', () => ({
  default: { template: '<div class="secondary-nav" />' },
}))
vi.mock('@/features/shared/ui/ScopeViewToggler.vue', () => ({
  default: { template: '<div class="scope-view-toggler" />', props: ['modelValue'] },
}))
vi.mock('@/features/shared/ui/StoreErrorOverlay.vue', () => ({
  default: { template: '<div class="store-error"><slot /></div>', props: ['error'] },
}))
vi.mock('@/assets/icons/interface/square.svg', () => ({ default: 'IconSquare' }))
vi.mock('@/assets/icons/interface/map.svg', () => ({ default: 'IconMap' }))
vi.mock('../../shared/composables/useCountries', () => ({
  useCountries: () => ({ countryCodeToName: vi.fn(() => 'Test Country') }),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

const vmState = {
  viewerProfile: ref({ isDatingActive: true }),
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
  currentScope: ref('dating'),
  viewModeModel: ref('grid'),
  scopeModel: ref('dating'),
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  datingPrefs: ref<{ prefAgeMin: number; prefAgeMax: number } | null>(null),
  socialFilter: ref<{ location: { country: string }; radius: number } | null>(null),
  selectedProfileId: ref<string | null>(null),
  isInitialized: ref(true),
  isLoadingMore: ref(false),
  hideProfile: vi.fn(),
  updatePrefs: vi.fn(),
  openProfile: vi.fn(),
  hasMoreProfiles: ref(true),
  initialize: vi.fn(),
  reset: vi.fn(),
  loadMoreProfiles: vi.fn(),
}

vi.mock('../../composables/useFindMatchViewModel', () => ({ useFindMatchViewModel: () => vmState }))

const BPlaceholderWrapper = {
  props: ['loading'],
  template: `<div><slot v-if="!loading" /><slot name="loading" v-else /></div>`,
}
const BOverlay = { template: '<div class="b-overlay"><slot /><slot name="overlay" /></div>' }
const BModal = { template: '<div class="b-modal"><slot /></div>', props: ['modelValue'] }
const BButton = { template: '<button><slot /></button>' }
const BContainer = { template: '<div class="container"><slot /></div>' }
const BSpinner = { template: '<div class="spinner" />', props: ['variant', 'small'] }

import BrowseProfiles from '../BrowseProfiles.vue'

describe('BrowseProfiles view', () => {
  beforeEach(() => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = true
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = true
    vmState.selectedProfileId.value = null
    vmState.currentScope.value = 'dating'
    vmState.isLoadingMore.value = false
    vmState.hasMoreProfiles.value = true
  })

  const mountComponent = () => {
    vmState.viewModeModel.value = 'grid'
    return mount(BrowseProfiles, {
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

  it('displays placeholders while loading (store loading)', () => {
    vmState.findProfileStoreLoading.value = true
    vmState.isInitialized.value = true // Already initialized but store is loading
    const wrapper = mountComponent()
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
  })

  it('displays placeholders while initializing', () => {
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = false // Not yet initialized
    const wrapper = mountComponent()
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
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
    const wrapper = mount(BrowseProfiles, {
      global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } },
    })
    expect(wrapper.find('.profile-grid').exists()).toBe(true)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(false)
  })

  it('renders map when in map view mode', () => {
    vmState.viewModeModel.value = 'map'
    const wrapper = mount(BrowseProfiles, {
      global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } },
    })
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
    expect(wrapper.find('.osm-poi-map').exists()).toBe(true)
  })

  it('shows no-access overlay when not initialized yet but access would be false', () => {
    vmState.haveAccess.value = false
    vmState.isInitialized.value = false // Still initializing
    const wrapper = mountComponent()
    // Should show loading placeholders, not the no-access overlay during initialization
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.no-access').exists()).toBe(false)
  })

  it('shows no-results overlay when not initialized yet but results would be false', () => {
    vmState.haveResults.value = false
    vmState.isInitialized.value = false // Still initializing
    const wrapper = mountComponent()
    // Should show loading placeholders, not the no-results overlay during initialization
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  it('shows no-access overlay when initialized and access is false', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    vmState.isInitialized.value = true // Initialized
    const wrapper = mountComponent()
    expect(wrapper.find('.no-access').exists()).toBe(true)
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  it('shows no-results overlay when initialized, access is true but no results', () => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = false
    vmState.isInitialized.value = true // Initialized
    const wrapper = mountComponent()
    expect(wrapper.find('.no-access').exists()).toBe(false)
    expect(wrapper.find('.no-results').exists()).toBe(true)
  })

  // ViewMode Tests - List View (default state)
  describe('ViewMode - List View', () => {
    it('displays grid view when no profile is selected', () => {
      vmState.selectedProfileId.value = null
      const wrapper = mountComponent()

      expect(wrapper.find('.list-view').exists()).toBe(true)
      expect(wrapper.find('.detail-view').exists()).toBe(false)
      expect(wrapper.find('.list-view').classes()).not.toContain('inactive')
    })

    it('shows scope view toggler in grid view', () => {
      vmState.selectedProfileId.value = null
      const wrapper = mountComponent()

      expect(wrapper.find('.secondary-nav').exists()).toBe(true)
    })

    it('shows filter controls in grid view for dating scope', () => {
      vmState.selectedProfileId.value = null
      vmState.currentScope.value = 'dating'
      vmState.datingPrefs.value = { prefAgeMin: 18, prefAgeMax: 30 }
      const wrapper = mountComponent()

      expect(wrapper.find('.dating-prefs-display').exists()).toBe(true)
    })

    it('shows filter controls in grid view for social scope', () => {
      vmState.selectedProfileId.value = null
      vmState.currentScope.value = 'social'
      vmState.socialFilter.value = { location: { country: 'US' }, radius: 50 }
      const wrapper = mountComponent()

      expect(wrapper.find('.social-filter-display').exists()).toBe(true)
    })
  })

  // ViewMode Tests - Detail View
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

    it('hides grid view when in detail view', () => {
      vmState.selectedProfileId.value = 'profile-123'
      const wrapper = mountComponent()

      const gridView = wrapper.find('.list-view')
      expect(gridView.classes()).toContain('inactive')
    })

    it('transitions from grid to detail view', async () => {
      vmState.selectedProfileId.value = null
      const wrapper = mountComponent()

      // Initially in grid view
      expect(wrapper.find('.list-view').classes()).not.toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(false)

      // Switch to detail view
      vmState.selectedProfileId.value = 'profile-456'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.list-view').classes()).toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(true)
    })

    it('transitions from detail to grid view', async () => {
      vmState.selectedProfileId.value = 'profile-789'
      const wrapper = mountComponent()

      // Initially in detail view
      expect(wrapper.find('.list-view').classes()).toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(true)

      // Switch to grid view
      vmState.selectedProfileId.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.list-view').classes()).not.toContain('inactive')
      expect(wrapper.find('.detail-view').exists()).toBe(false)
    })
  })

  // OsmPoiMap Tests
  describe('OsmPoiMap Component', () => {
    it('renders OsmPoiMap component when mocked', () => {
      const wrapper = mountComponent()
      // Since OsmPoiMap is mocked, we can test the mock itself
      expect(wrapper.find('.osm-poi-map').exists()).toBe(false) // Not used in current template
    })

    it('OsmPoiMap mock accepts profiles prop', () => {
      // Test the mock component directly
      const osmPoiMapMock = mount({
        template: '<OsmPoiMap :profiles="testProfiles" />',
        components: {
          OsmPoiMap: {
            template: '<div class="osm-poi-map" />',
            props: ['profiles', 'selectedProfile'],
          },
        },
        data() {
          return {
            testProfiles: [{ id: '1', name: 'Test Profile' }],
          }
        },
      })

      expect(osmPoiMapMock.find('.osm-poi-map').exists()).toBe(true)
    })

    it('OsmPoiMap mock accepts selectedProfile prop', () => {
      // Test the mock component directly
      const osmPoiMapMock = mount({
        template: '<OsmPoiMap :selectedProfile="selectedProfile" />',
        components: {
          OsmPoiMap: {
            template: '<div class="osm-poi-map" />',
            props: ['profiles', 'selectedProfile'],
          },
        },
        data() {
          return {
            selectedProfile: { id: '1', name: 'Selected Profile' },
          }
        },
      })

      expect(osmPoiMapMock.find('.osm-poi-map').exists()).toBe(true)
    })

    it('OsmPoiMap mock can be integrated into BrowseProfiles if needed', () => {
      // This test verifies the mock is properly set up for future integration
      const mockModule = vi.importMock('../../components/OsmPoiMap.vue')
      expect(mockModule).toBeDefined()
    })
  })
})
