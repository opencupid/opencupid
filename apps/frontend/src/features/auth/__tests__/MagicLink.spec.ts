import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../stores/authStore'
import MagicLink from '../views/MagicLink.vue'

const push = vi.fn()
const route = {
  query: {} as Record<string, unknown>,
}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({ getLanguage: () => 'en' }),
}))

vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({
  default: { template: '<div />' },
}))

const tokenComponentStub = {
  name: 'TokenInput',
  props: ['validationError', 'initialToken'],
  template: '<div data-testid="token-form">{{ validationError }}|{{ initialToken }}</div>',
}

const mountMagicLink = () =>
  mount(MagicLink, {
    global: {
      stubs: {
        TokenInput: tokenComponentStub,
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

describe('MagicLink', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.query = {}
    push.mockReset()
  })

  it('redirects valid magic-link token without rendering form', async () => {
    route.query = { token: '123456' }
    vi.spyOn(useAuthStore(), 'verifyToken').mockResolvedValue({ success: true, status: '' })

    const wrapper = mountMagicLink()

    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)

    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'UserHome' })
    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)
  })

  it('renders the form with expired error when token is expired', async () => {
    route.query = { token: '123456' }
    vi.spyOn(useAuthStore(), 'verifyToken').mockResolvedValue({
      success: false,
      code: 'AUTH_EXPIRED_TOKEN',
      message: 'expired',
      restart: 'otp',
    })

    const wrapper = mountMagicLink()

    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)

    await flushPromises()

    expect(push).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.token_expired')
    expect(wrapper.text()).toContain('123456')
  })

  it('renders the form when magic-link token query is invalid', async () => {
    route.query = { token: '123' }
    const verifyTokenSpy = vi.spyOn(useAuthStore(), 'verifyToken')

    const wrapper = mountMagicLink()

    await flushPromises()

    expect(verifyTokenSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.token_invalid_link')
    expect(wrapper.text()).toContain('123')
  })
})
