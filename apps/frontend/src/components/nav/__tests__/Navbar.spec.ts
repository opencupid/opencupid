import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { template: '<div />' },
}))
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/setting-2.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/search.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/user.svg', () => ({ default: { template: '<div />' } }))

const logout = vi.fn()
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ isLoggedIn: true, logout }) }))
vi.mock('@/store/messageStore', () => ({ useMessageStore: () => ({ hasUnreadMessages: false }) }))
vi.mock('@/store/profileStore', () => ({ useProfileStore: () => ({}) }))

import Navbar from '../Navbar.vue'
const stub = { template: '<div><slot /></div>' }

describe('Navbar', () => {
  it('renders when logged in', () => {
    const wrapper = mount(Navbar, {
      global: {
        stubs: { BNavbar: stub, BNavItem: stub, BNavbarNav: stub, FontAwesomeIcon: stub },
        mocks: { $t: (msg: string) => msg },
      }
    })
    expect(wrapper.html()).toContain('nav.browse')
    expect(wrapper.html()).toContain('nav.settings')
  })
})
