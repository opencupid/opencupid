import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/sun.svg', () => ({ default: { template: '<div />' } }))

import LoginConfirmComponent from '../components/LoginConfirmComponent.vue'

describe('LoginConfirmComponent', () => {
  it('renders welcome text', () => {
    const wrapper = mount(LoginConfirmComponent)
    expect(wrapper.text()).toContain('auth.login_confirm_welcome')
  })
})
