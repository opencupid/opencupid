import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// stub child components
vi.mock('../../components/SecondaryNav.vue', () => ({ default: { template: '<div class="secondary-nav" />' } }))
vi.mock('../../components/ProfileCardGrid.vue', () => ({ default: { template: '<div class="profile-grid" />', props: ['profiles'] } }))
vi.mock('../../components/PlaceholdersGrid.vue', () => ({ default: { template: '<div class="placeholders-grid" />', props: ['howMany','loading'] } }))
vi.mock('../../components/NoAccessCTA.vue', () => ({ default: { template: '<div class="no-access" />', props: ['modelValue'] } }))
vi.mock('../../components/NoResultsCTA.vue', () => ({ default: { template: '<div class="no-results" />' } }))
vi.mock('../../components/DatingPreferencesForm.vue', () => ({ default: { template: '<div class="prefs-form" />', props: ['modelValue'] } }))
vi.mock('../../components/MiddleColumn.vue', () => ({ default: { template: '<div class="middle"><slot /></div>' } }))
vi.mock('@/features/publicprofile/components/PublicProfile.vue', () => ({ default: { template: '<div class="public-profile" />', props: ['id'] } }))
vi.mock('@/features/interaction/components/ReceivedLikesCount.vue', () => ({ default: { template: '<div class="received-likes" />' } }))
vi.mock('@/features/shared/ui/StoreErrorOverlay.vue', () => ({ default: { template: '<div class="store-error"><slot /></div>', props: ['error'] } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }))

const vmState = {
  viewerProfile: ref({ isDatingActive: true }),
  haveAccess: ref(true),
  haveResults: ref(true),
  isLoading: ref(false),
  currentScope: ref('dating'),
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  datingPrefs: ref(null),
  selectedProfileId: ref(null),
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
    vmState.isLoading.value = false
  })

  it('displays placeholders while loading', () => {
    vmState.isLoading.value = true
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } } })
    expect(wrapper.find('.placeholders-grid').exists()).toBe(true)
    expect(wrapper.find('.profile-grid').exists()).toBe(false)
  })

  it('shows no-access overlay when viewer lacks access', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } } })
    expect(wrapper.find('.no-access').exists()).toBe(true)
  })

  it('shows no-results overlay when there are no results', () => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = false
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } } })
    expect(wrapper.find('.no-results').exists()).toBe(true)
  })

  it('renders profile grid when results available', () => {
    const wrapper = mount(BrowseProfiles, { global: { stubs: { BPlaceholderWrapper, BOverlay, BModal, BButton } } })
    expect(wrapper.find('.profile-grid').exists()).toBe(true)
  })
})
