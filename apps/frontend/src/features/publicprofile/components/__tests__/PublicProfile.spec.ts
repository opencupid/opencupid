import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../ProfileContent.vue', () => ({ default: { template: '<div class="profile-content" />', props: ['profile','isLoading'] } }))
vi.mock('../PublicProfileSecondaryNav.vue', () => ({ default: { template: '<div class="secondary-nav" />' } }))
vi.mock('../BlockProfileDialog.vue', () => ({ default: { template: '<div class="block-dialog" />', props: ['profile','modelValue','loading'] } }))
vi.mock('@/features/interaction/components/DatingInteractions.vue', () => ({ default: { template: '<div class="dating-interactions" />', props: ['profile'] } }))
vi.mock('../../composables/usePublicProfile', () => ({ usePublicProfile: () => mockState }))

const mockState = {
  fetchProfile: vi.fn(),
  refreshProfile: vi.fn(),
  blockProfile: vi.fn(),
  profile: reactive({ id: '1', publicName: 'A', isDatingActive: true } as any),
  isLoading: ref(false),
  error: ref(null)
}

const BPlaceholderWrapper = {
  props: ['loading'],
  template: `<div><slot v-if="!loading" /><slot name="loading" v-else /></div>`
}
const BPlaceholderCard = { template: '<div class="placeholder-card" />', props: ['imgHeight'] }
const BButton = { template: '<button><slot /></button>' }

import PublicProfile from '../PublicProfile.vue'

describe('PublicProfile component', () => {
  beforeEach(() => {
    mockState.isLoading.value = false
    mockState.error.value = null
  })

  it('shows placeholder card while loading', () => {
    mockState.isLoading.value = true
    const wrapper = mount(PublicProfile, {
      props: { id: '1' },
      global: { stubs: { BPlaceholderWrapper, BPlaceholderCard, BButton } }
    })
    expect(wrapper.find('.placeholder-card').exists()).toBe(true)
    expect(wrapper.find('.profile-content').exists()).toBe(false)
  })

  it('renders profile content when loaded', () => {
    const wrapper = mount(PublicProfile, {
      props: { id: '1' },
      global: { stubs: { BPlaceholderWrapper, BPlaceholderCard, BButton } }
    })
    expect(wrapper.find('.profile-content').exists()).toBe(true)
  })
})
