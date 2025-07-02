import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock bus first to prevent side effects from the interaction store
vi.mock('@/lib/bus', () => ({
  bus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { template: '<div />' },
}))
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/setting-2.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/search.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/heart.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/user.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/NotificationDot.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/features/images/components/ProfileImage.vue', () => ({ default: { template: '<div />' } }))

const logout = vi.fn()
const authStore = vi.fn()
const ownerProfileStore = vi.fn()
const messageStore = vi.fn()
const interactionStore = vi.fn()

vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: authStore }))
vi.mock('@/features/messaging/stores/messageStore', () => ({ useMessageStore: messageStore }))
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({ useOwnerProfileStore: ownerProfileStore }))
vi.mock('@/features/interaction/stores/useInteractionStore', () => ({ useInteractionStore: interactionStore }))

import Navbar from '../Navbar.vue'
const stub = { template: '<div><slot /></div>' }

describe('Navbar', () => {
  beforeEach(() => {
    // Default mocks
    authStore.mockReturnValue({ isLoggedIn: true, logout })
    messageStore.mockReturnValue({ hasUnreadMessages: false })
    interactionStore.mockReturnValue({ matches: [], receivedLikesCount: 0 })
  })

  it('renders when logged in and profile is loaded with dating active', () => {
    ownerProfileStore.mockReturnValue({ 
      profile: { isDatingActive: true, profileImages: [] }, 
      isLoading: false 
    })
    
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).toContain('nav.settings')
    expect(wrapper.html()).toContain('Matches')
  })

  it('does not render when logged in but profile is loading', () => {
    ownerProfileStore.mockReturnValue({ 
      profile: null, 
      isLoading: true 
    })
    
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    // Should not render the navbar at all
    expect(wrapper.find('[data-testid="navbar"]').exists()).toBe(false)
  })

  it('does not render when logged in but profile is not loaded', () => {
    ownerProfileStore.mockReturnValue({ 
      profile: null, 
      isLoading: false 
    })
    
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    // Should not render the navbar at all
    expect(wrapper.find('[data-testid="navbar"]').exists()).toBe(false)
  })

  it('does not render matches nav item when dating is inactive', () => {
    ownerProfileStore.mockReturnValue({ 
      profile: { isDatingActive: false, profileImages: [] }, 
      isLoading: false 
    })
    
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).not.toContain('Matches')
  })

  it('does not render when not logged in', () => {
    authStore.mockReturnValue({ isLoggedIn: false, logout })
    ownerProfileStore.mockReturnValue({ 
      profile: { isDatingActive: true, profileImages: [] }, 
      isLoading: false 
    })
    
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    // Should not render the navbar at all
    expect(wrapper.find('[data-testid="navbar"]').exists()).toBe(false)
  })
})
