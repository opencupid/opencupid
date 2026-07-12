import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

const push = vi.fn()
const sendMagicLink = vi.fn()
const setLanguage = vi.fn()
const track = vi.hoisted(() => vi.fn())

vi.mock('@/lib/umami', () => ({ tracker: { track } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
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
    track.mockReset()
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

  const mountWithSubmittingLoginForm = () =>
    mount(LoginView, {
      global: {
        stubs: {
          LoginForm: {
            template:
              "<button data-test=\"submit\" @click=\"$emit('updated', { email: 'test@example.com', captchaSolution: 'ok', language: '' })\" />",
          },
          LocaleSelector: { template: '<div />' },
          ErrorComponent: { template: '<div />' },
          LogoComponent: { template: '<div />' },
        },
      },
    })

  it('tracks auth-magic-link-failed when sending the magic link fails', async () => {
    sendMagicLink.mockResolvedValue({
      success: false,
      code: 'AUTH_RATE_LIMITED',
      message: 'slow down',
      restart: 'userid',
    })

    const wrapper = mountWithSubmittingLoginForm()
    await wrapper.get('[data-test="submit"]').trigger('click')
    await flushPromises()

    expect(track).toHaveBeenCalledWith('auth-magic-link-failed', { code: 'AUTH_RATE_LIMITED' })
    expect(push).not.toHaveBeenCalled()
  })

  it('does not track failure events when the magic link is sent', async () => {
    sendMagicLink.mockResolvedValue({ success: true, user: {} })

    const wrapper = mountWithSubmittingLoginForm()
    await wrapper.get('[data-test="submit"]').trigger('click')
    await flushPromises()

    expect(track).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'MagicLink' })
  })
})
