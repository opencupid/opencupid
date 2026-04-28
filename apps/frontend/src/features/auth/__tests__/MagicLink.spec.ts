import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Disable DEV before MagicLink loads so the dev-only DevAutoLogin stub is null
const previousDev = vi.hoisted(() => {
  const prev = (import.meta.env as any).DEV
  ;(import.meta.env as any).DEV = false
  return prev
})

import { useAuthStore } from '../stores/authStore'
import MagicLink from '../views/MagicLink.vue'

afterAll(() => {
  ;(import.meta.env as any).DEV = previousDev
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
vi.mock('@/assets/icons/interface/mail.svg', () => ({
  default: { template: '<div />' },
}))

const mountMagicLink = () =>
  mount(MagicLink, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

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

  it('redirects to /browse on valid magic-link token', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

    mountMagicLink()
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/browse')
  })

  it('shows check-email message when no token in query', async () => {
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(wrapper.text()).toContain('auth.token_check_email')
  })

  it('shows only error and back button on failed magic link, hiding title and hint', async () => {
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

    expect(wrapper.text()).not.toContain('auth.token_check_email')
    expect(wrapper.text()).not.toContain('auth.token_check_messages')
    expect(wrapper.text()).toContain('auth.token_expired')
    expect(wrapper.text()).toContain('uicomponents.back_button_title')
  })
})
