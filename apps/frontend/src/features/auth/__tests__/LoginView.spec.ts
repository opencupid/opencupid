import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

const push = vi.fn()
const sendMagicLink = vi.fn()
const setLanguage = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ sendMagicLink }) }))
vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    getLanguage: () => 'en',
    setLanguage,
  }),
}))

import LoginView from '../views/LoginView.vue'

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    push.mockReset()
    sendMagicLink.mockReset()
    setLanguage.mockReset()
  })

  it('prefills auth id input from localStorage', async () => {
    localStorage.setItem('authId', 'test@example.com')

    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          LoginForm: {
            props: ['isLoading', 'defaultAuthId'],
            template:
              '<div data-test="auth-id-component" :data-default-auth-id="defaultAuthId"></div>',
          },
          LocaleSelector: { template: '<div />' },
          ErrorComponent: { template: '<div />' },
          LogoComponent: { template: '<div />' },
        },
      },
    })

    await nextTick()

    expect(wrapper.get('[data-test="auth-id-component"]').attributes('data-default-auth-id')).toBe(
      'test@example.com'
    )
  })
})
