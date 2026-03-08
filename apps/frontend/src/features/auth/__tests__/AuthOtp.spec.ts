import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../stores/authStore'
import AuthOtp from '../views/AuthOtp.vue'

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

const otpComponentStub = {
  name: 'OtpLoginComponent',
  props: ['validationError', 'initialOtp'],
  template: '<div data-testid="otp-form">{{ validationError }}|{{ initialOtp }}</div>',
}

const mountAuthOtp = () =>
  mount(AuthOtp, {
    global: {
      stubs: {
        OtpLoginComponent: otpComponentStub,
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })

describe('AuthOtp', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.query = {}
    push.mockReset()
  })

  it('redirects valid magic-link OTP without rendering form', async () => {
    route.query = { otp: '123456' }
    vi.spyOn(useAuthStore(), 'otpLogin').mockResolvedValue({ success: true, status: '' })

    const wrapper = mountAuthOtp()

    expect(wrapper.find('[data-testid="otp-form"]').exists()).toBe(false)

    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'UserHome' })
    expect(wrapper.find('[data-testid="otp-form"]').exists()).toBe(false)
  })

  it('renders the form with expired error when OTP is expired', async () => {
    route.query = { otp: '123456' }
    vi.spyOn(useAuthStore(), 'otpLogin').mockResolvedValue({
      success: false,
      code: 'AUTH_EXPIRED_OTP',
      message: 'expired',
      restart: 'otp',
    })

    const wrapper = mountAuthOtp()

    expect(wrapper.find('[data-testid="otp-form"]').exists()).toBe(false)

    await flushPromises()

    expect(push).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="otp-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.otp_expired')
    expect(wrapper.text()).toContain('123456')
  })

  it('renders the form when magic-link OTP query is invalid', async () => {
    route.query = { otp: '123' }
    const otpLoginSpy = vi.spyOn(useAuthStore(), 'otpLogin')

    const wrapper = mountAuthOtp()

    await flushPromises()

    expect(otpLoginSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="otp-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('auth.otp_invalid_link')
    expect(wrapper.text()).toContain('123')
  })
})
