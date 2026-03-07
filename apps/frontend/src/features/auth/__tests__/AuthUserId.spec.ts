import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

const push = vi.fn()
const sendLoginLink = vi.fn()
const setLanguage = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ sendLoginLink }) }))
vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    getLanguage: () => 'en',
    setLanguage,
  }),
}))

import AuthUserId from '../views/AuthUserId.vue'

describe('AuthUserId', () => {
  beforeEach(() => {
    localStorage.clear()
    push.mockReset()
    sendLoginLink.mockReset()
    setLanguage.mockReset()
  })

  it('prefills auth id input from localStorage', async () => {
    localStorage.setItem('authId', 'test@example.com')

    const wrapper = mount(AuthUserId, {
      global: {
        stubs: {
          AuthIdComponent: {
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
