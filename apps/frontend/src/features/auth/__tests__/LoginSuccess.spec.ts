import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/sun.svg', () => ({ default: { template: '<div />' } }))

import LoginSuccess from '../components/LoginSuccess.vue'

describe('LoginSuccess', () => {
  it('renders welcome text', () => {
    const wrapper = mount(LoginSuccess)
    expect(wrapper.text()).toContain('auth.login_confirm_welcome')
  })
})
