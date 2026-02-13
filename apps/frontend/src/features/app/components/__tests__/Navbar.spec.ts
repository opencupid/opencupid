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
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/search.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/heart.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/user.svg', () => ({ default: { template: '<div class="default-user-icon" />' } }))
vi.mock('@/assets/icons/interface/home.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message-2.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/NotificationDot.vue', () => ({ default: { template: '<div><slot /></div>' } }))
vi.mock('@/features/images/components/ProfileImage.vue', () => ({ default: { template: '<div class="profile-thumbnail" />' } }))

const mockIsLoggedIn: { value: boolean } = { value: true }

vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: () => ({
    get isLoggedIn() {
      return mockIsLoggedIn.value
    }
  })
}))


vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({
    hasUnreadMessages: false
  })
}))

const mockProfileRef: { value: { isDatingActive: boolean; isOnboarded: boolean; profileImages: { id?: string; variants: { size: string; url: string }[] }[] } } =
  { value: { isDatingActive: true, isOnboarded: true, profileImages: [] } }

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    get profile() {
      return mockProfileRef.value
    },
    isLoading: false,
  })
}))


vi.mock('@/features/interaction/stores/useInteractionStore', () => ({
  useInteractionStore: () => ({
    matches: [],
    receivedLikesCount: 0
  })
}))


import Navbar from '../Navbar.vue'
const stub = { template: '<div><slot /></div>' }

describe('Navbar', () => {
  it('does not render when no logged in', () => {
    mockIsLoggedIn.value = false
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          BNavbar: stub,
          BNavItem: stub,
          BNavbarNav: stub,
          FontAwesomeIcon: stub
        },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).not.toContain('nav')
  })

  it('does not render when logged in but not onBoarded', () => {
    mockIsLoggedIn.value = true
    mockProfileRef.value = { isDatingActive: true, isOnboarded: false, profileImages: [{ variants: [{ size: 'original', url: '/path' }] }] }
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          BNavbar: stub,
          BNavItem: stub,
          BNavbarNav: stub,
          FontAwesomeIcon: stub
        },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).not.toContain('nav')
  })

  it('renders when logged in and profile image is loaded', () => {
    mockIsLoggedIn.value = true
    mockProfileRef.value = { isDatingActive: true, isOnboarded: true, profileImages: [{ variants: [{ size: 'original', url: '/path' }] }] }
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          BNavbar: stub,
          BNavItem: stub,
          BNavbarNav: stub,
          FontAwesomeIcon: stub
        },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.home')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).toContain('nav.matches')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('profile-thumbnail')
  })

  it('renders when logged in and no profile image is loaded', () => {
    mockIsLoggedIn.value = true
    mockProfileRef.value = { isDatingActive: true, isOnboarded: true, profileImages: [] }
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          BNavbar: stub,
          BNavItem: stub,
          BNavbarNav: stub,
          FontAwesomeIcon: stub
        },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.home')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).toContain('nav.matches')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('default-user-icon')
  })


  it('renders when logged in and no matches menu', () => {
    mockIsLoggedIn.value = true
    mockProfileRef.value = { isDatingActive: false, isOnboarded: true, profileImages: [] }
    const wrapper = mount(Navbar, {
      global: {
        stubs: {
          BNavbar: stub,
          BNavItem: stub,
          BNavbarNav: stub,
          FontAwesomeIcon: stub
        },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.home')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).not.toContain('nav.matches')
    expect(wrapper.html()).toContain('nav.inbox')
    expect(wrapper.html()).toContain('default-user-icon')
  })

})


