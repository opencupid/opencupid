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
vi.mock('../../components/DatingPreferencesForm.vue', () => ({
  default: { template: '<div class="prefs-form" />', props: ['modelValue'] },
}))
vi.mock('../../components/DatingPrefsDisplay.vue', () => ({
  default: {
    template: '<div class="dating-prefs-display" />',
    props: ['modelValue'],
  },
}))
vi.mock('@/features/publicprofile/components/PublicProfile.vue', () => ({
  default: { template: '<div class="public-profile" />', props: ['id'] },
}))
vi.mock('@/features/interaction/components/LikesAndMatchesBanner.vue', () => ({
  default: { template: '<div class="likes-banner" />' },
}))
vi.mock('@/features/interaction/components/MatchesList.vue', () => ({
  default: { template: '<div class="matches-list" />', props: ['edges'] },
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
  profileList: ref([{ id: '1' }]),
  storeError: ref(null),
  datingPrefs: ref<{ prefAgeMin: number; prefAgeMax: number } | null>(null),
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
  matches: ref([] as { id: string; profile: { id: string } }[]),
  haveMatches: ref(false),
  haveNewMatches: ref(false),
  haveReceivedLikes: ref(true),
  haveSentLikes: ref(false),
  receivedLikesCount: ref(3),
  newMatchesCount: ref(0),
}

vi.mock('../../composables/useDatingMatchViewModel', () => ({
  useDatingMatchViewModel: () => vmState,
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

import DatingMatch from '../DatingMatch.vue'

describe('DatingMatch view', () => {
  beforeEach(() => {
    vmState.haveAccess.value = true
    vmState.haveResults.value = true
    vmState.findProfileStoreLoading.value = false
    vmState.ownerStoreLoading.value = false
    vmState.isInitialized.value = true
    vmState.selectedProfileId.value = null
    vmState.isLoadingMore.value = false
    vmState.hasMoreProfiles.value = true
    vmState.haveMatches.value = false
  })

  const mountComponent = () => {
    return mount(DatingMatch, {
      global: {
        stubs: {
          BPlaceholderWrapper,
          BOverlay,
          BModal,
          BButton,
          BContainer,
          BSpinner,
        },
        mocks: { $t: (k: string) => k },
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

  it('shows no-access overlay when viewer lacks access', () => {
    vmState.haveAccess.value = false
    vmState.haveResults.value = false
    const wrapper = mountComponent()
    expect(wrapper.find('.no-access').exists()).toBe(true)
  })

  it('renders profile grid when results are available', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.profile-grid').exists()).toBe(true)
  })

  it('renders likes and matches banner', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.likes-banner').exists()).toBe(true)
  })

  it('shows matches list when there are matches', () => {
    vmState.haveMatches.value = true
    vmState.matches.value = [{ id: '1', profile: { id: 'p1' } }]
    const wrapper = mountComponent()
    expect(wrapper.find('.matches-list').exists()).toBe(true)
  })

  it('hides matches list when there are no matches', () => {
    vmState.haveMatches.value = false
    vmState.matches.value = []
    const wrapper = mountComponent()
    expect(wrapper.find('.matches-list').exists()).toBe(false)
  })

  it('shows dating prefs display when access is granted', () => {
    vmState.datingPrefs.value = { prefAgeMin: 25, prefAgeMax: 35 }
    const wrapper = mountComponent()
    expect(wrapper.find('.dating-prefs-display').exists()).toBe(true)
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
  })
})
