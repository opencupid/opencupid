import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/logout.svg', () => ({ default: { template: '<div />' } }))

const logout = vi.fn()
const push = vi.fn()
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ logout }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

import LogoutButton from '../components/LogoutButton.vue'

describe('LogoutButton', () => {
  it('logs out and redirects on click', async () => {
    const wrapper = mount(LogoutButton)
    await wrapper.find('a').trigger('click')
    expect(logout).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'Login' })
  })
})
