import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Disable DEV before MagicLink loads so the dev-only DevAutoLogin stub is null
vi.hoisted(() => {
  ;(import.meta.env as any).DEV = false
})

import { useAuthStore } from '../stores/authStore'
import MagicLink from '../views/MagicLink.vue'

afterAll(() => {
  ;(import.meta.env as any).DEV = true
})

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

vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/assets/icons/interface/message.svg', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/assets/icons/interface/mail.svg', () => ({
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

const phoneLoginUser = {
  id: 'ck1234567890abcd12345679',
  email: '',
  phonenumber: '+12345678901',
  language: 'en',
  newsletterOptIn: true,
  isPushNotificationEnabled: false,
}

const emailLoginUser = {
  id: 'ck1234567890abcd12345678',
  email: 'test@example.com',
  phonenumber: '',
  language: 'en',
  newsletterOptIn: true,
  isPushNotificationEnabled: false,
}

describe('MagicLink', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.query = {}
    push.mockReset()
  })

  it('redirects valid magic-link token without rendering form', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

    const wrapper = mountMagicLink()

    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)

    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'UserHome' })
    expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)
  })

  describe('phone auth', () => {
    it('renders TokenInput with expired error when token is expired', async () => {
      route.query = { token: '123456' }
      const authStore = useAuthStore()
      authStore.loginUser = phoneLoginUser
      vi.spyOn(authStore, 'verifyToken').mockResolvedValue({
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

    it('renders TokenInput when magic-link token query is invalid', async () => {
      route.query = { token: '123' }
      const authStore = useAuthStore()
      authStore.loginUser = phoneLoginUser
      const verifyTokenSpy = vi.spyOn(authStore, 'verifyToken')

      const wrapper = mountMagicLink()

      await flushPromises()

      expect(verifyTokenSpy).not.toHaveBeenCalled()
      expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('auth.token_invalid_link')
      expect(wrapper.text()).toContain('123')
    })
  })

  describe('email auth', () => {
    it('shows check-email message instead of TokenInput', async () => {
      const authStore = useAuthStore()
      authStore.loginUser = emailLoginUser

      const wrapper = mountMagicLink()

      await flushPromises()

      expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('auth.token_check_email')
    })

    it('shows error alongside check-email message on failed magic link', async () => {
      route.query = { token: '123456' }
      const authStore = useAuthStore()
      authStore.loginUser = emailLoginUser
      vi.spyOn(authStore, 'verifyToken').mockResolvedValue({
        success: false,
        code: 'AUTH_EXPIRED_TOKEN',
        message: 'expired',
        restart: 'otp',
      })

      const wrapper = mountMagicLink()

      await flushPromises()

      expect(wrapper.find('[data-testid="token-form"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('auth.token_check_email')
      expect(wrapper.text()).toContain('auth.token_expired')
    })
  })
})
