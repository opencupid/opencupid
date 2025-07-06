import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))

// stub child components
vi.mock('../../components/ProfileCardGrid.vue', () => ({ default: { template: '<div class="profile-grid" />', props: ['profiles'] } }))
vi.mock('../../components/PlaceholdersGrid.vue', () => ({ default: { template: '<div class="placeholders-grid" />', props: ['howMany','loading'] } }))
vi.mock('../../components/NoAccessCTA.vue', () => ({ default: { template: '<div class="no-access" />', props: ['modelValue'] } }))
vi.mock('../../components/NoResultsCTA.vue', () => ({ default: { template: '<div class="no-results" />' } }))
vi.mock('../../components/DatingPreferencesForm.vue', () => ({ default: { template: '<div class="prefs-form" />', props: ['modelValue'] } }))
vi.mock('../../components/MiddleColumn.vue', () => ({ default: { template: '<div class="middle"><slot /></div>' } }))
vi.mock('@/features/publicprofile/components/PublicProfile.vue', () => ({ default: { template: '<div class="public-profile" />', props: ['id'] } }))
vi.mock('@/features/interaction/components/ReceivedLikesCount.vue', () => ({ default: { template: '<div class="received-likes" />' } }))
vi.mock('@/features/shared/ui/SecondaryNav.vue', () => ({ default: { template: '<div class="secondary-nav" />' } }))
vi.mock('@/features/shared/ui/StoreErrorOverlay.vue', () => ({ default: { template: '<div class="store-error"><slot /></div>', props: ['error'] } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }))

const vmState = {
  viewerProfile: ref({ isDatingActive: true }),
  haveAccess: ref(true),
  haveResults: ref(true),
  isLoading: computed((): boolean => vmState.findProfileStoreLoading.value || vmState.ownerStoreLoading.value || !vmState.isInitialized.value),
  findProfileStoreLoading: ref(false),
  ownerStoreLoading: ref(false),
  currentScope: ref('dating'),
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  datingPrefs: ref(null),
  selectedProfileId: ref(null),
  isInitialized: ref(true),
  hideProfile: vi.fn(),
  updateDatingPrefs: vi.fn(),
  initialize: vi.fn(),
  reset: vi.fn()
}

vi.mock('../../composables/useFindMatchViewModel', () => ({ useFindMatchViewModel: () => vmState }))

const BPlaceholderWrapper = {
  props: ['loading'],
  template: `<div><slot v-if="!loading" /><slot name="loading" v-else /></div>`
}
const BOverlay = { template: '<div class="b-overlay"><slot /><slot name="overlay" /></div>' }
const BModal = { template: '<div class="b-modal"><slot /></div>', props: ['modelValue'] }
const BButton = { template: '<button><slot /></button>' }

import BrowseProfiles from '../BrowseProfiles.vue'

describe('BrowseProfiles view', () => {
  beforeEach(() => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = true
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = true
  })

  it('displays placeholders while loading (store loading)', () => {
    vmState.findProfileStoreLoading.value = true
    vmState.isInitialized.value = true // Already initialized but store is loading
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
  })

  it('displays placeholders while initializing', () => {
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = false // Not yet initialized
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
  })

  it('shows no-access overlay when viewer lacks access', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.no-access').exists()).toBe(true)
  })

  it('shows no-results overlay when there are no results', () => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = false
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.no-results').exists()).toBe(true)
  })

  it('renders profile grid when results available', () => {
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.profile-grid').exists()).toBe(true)
  })

  it('shows no-access overlay when not initialized yet but access would be false', () => {
    vmState.haveAccess.value = false
    vmState.isInitialized.value = false // Still initializing
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    // Should show loading placeholders, not the no-access overlay during initialization
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.no-access').exists()).toBe(false)
  })

  it('shows no-results overlay when not initialized yet but results would be false', () => {
    vmState.haveResults.value = false 
    vmState.isInitialized.value = false // Still initializing
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    // Should show loading placeholders, not the no-results overlay during initialization
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  it('shows no-access overlay when initialized and access is false', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    vmState.isInitialized.value = true // Initialized
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.no-access').exists()).toBe(true)
    expect(wrapper.find('.no-results').exists()).toBe(false)
  })

  it('shows no-results overlay when initialized, access is true but no results', () => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = false
    vmState.isInitialized.value = true // Initialized
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton }, config: { globalProperties: { $t: (k:string)=>k } as any } } })
    expect(wrapper.find('.no-access').exists()).toBe(false)
    expect(wrapper.find('.no-results').exists()).toBe(true)
  })
})
