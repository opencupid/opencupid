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
import CaptchaWidget from '../components/CaptchaWidget.vue'

afterAll(() => {
  ;(import.meta.env as any).DEV = previousDev
})

const push = vi.fn()
const replace = vi.fn()
const resolve = vi.fn((path: string) => ({
  fullPath: path,
  meta: { requiresAuth: !path.startsWith('/auth') },
}))
const route = {
  query: {} as Record<string, unknown>,
}

const track = vi.hoisted(() => vi.fn())
vi.mock('@/lib/umami', () => ({
  tracker: { track },
}))

const bootstrapReady = vi.hoisted(() => vi.fn<() => Promise<void>>())
vi.mock('@/lib/auth', () => ({
  bootstrapReady,
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push, replace, resolve }),
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
        $t: (key: string, params?: Record<string, unknown>) =>
          params ? `${key} ${JSON.stringify(params)}` : key,
      },
      stubs: { CaptchaWidget: true },
    },
  })

const solveCaptcha = async (wrapper: ReturnType<typeof mountMagicLink>, payload = 'solved') => {
  wrapper.getComponent(CaptchaWidget).vm.$emit('update:payload', payload)
  await flushPromises()
}

// Mount, then solve the captcha: the emailed link only lands on the page, the
// token is verified once a human solves it.
const mountAndContinue = async () => {
  const wrapper = mountMagicLink()
  await solveCaptcha(wrapper)
  return wrapper
}

const emailLoginUser = {
  id: 'ck1234567890abcd12345678',
  email: 'test@example.com',
  phonenumber: '',
  language: 'en',
  isPushNotificationEnabled: false,
}

describe('MagicLink', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.query = {}
    localStorage.clear()
    push.mockReset()
    replace.mockReset()
    track.mockReset()
    bootstrapReady.mockReset()
    bootstrapReady.mockResolvedValue(undefined)
  })

  it('redirects to /browse on valid magic-link token', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

    await mountAndContinue()

    expect(replace).toHaveBeenCalledWith('/browse')
  })

  it('redirects to the deep link carried by the magic link', async () => {
    route.query = { token: '123456', redirect: '/inbox/abc' }
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

    await mountAndContinue()

    expect(replace).toHaveBeenCalledWith('/inbox/abc')
  })

  it.each(['//evil.example', 'https://evil.example', '/auth'])(
    'ignores redirect %s and lands on /browse',
    async (redirect) => {
      route.query = { token: '123456', redirect }
      const authStore = useAuthStore()
      vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

      await mountAndContinue()

      expect(replace).toHaveBeenCalledWith('/browse')
    }
  )

  it('keeps the deep link when going back to Login after a failed magic link', async () => {
    route.query = { token: '123456', redirect: '/inbox/abc' }
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({
      success: false,
      code: 'AUTH_EXPIRED_TOKEN',
      message: 'expired',
      restart: 'otp',
    })

    const wrapper = await mountAndContinue()
    await wrapper.get('.back-button a').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'Login', query: { redirect: '/inbox/abc' } })
  })

  it('does not spend the token on load when this browser did not request the link', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    const verifyToken = vi.spyOn(authStore, 'verifyToken')

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(verifyToken).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('auth.magic_link_prompt')
    expect(wrapper.findComponent(CaptchaWidget).exists()).toBe(true)
  })

  it('does not verify when the captcha is reset without a solution', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    const verifyToken = vi.spyOn(authStore, 'verifyToken')

    const wrapper = mountMagicLink()
    await solveCaptcha(wrapper, '')

    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('verifies only once when the captcha reports a solution twice', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    const verifyToken = vi.spyOn(authStore, 'verifyToken').mockReturnValue(new Promise(() => {}))

    const wrapper = mountMagicLink()
    wrapper.getComponent(CaptchaWidget).vm.$emit('update:payload', 'a')
    wrapper.getComponent(CaptchaWidget).vm.$emit('update:payload', 'b')
    await flushPromises()

    expect(verifyToken).toHaveBeenCalledOnce()
  })

  it('continues without the captcha when this browser requested the link', async () => {
    route.query = { token: '123456' }
    localStorage.setItem('authId', 'test@example.com')
    const authStore = useAuthStore()
    const verifyToken = vi
      .spyOn(authStore, 'verifyToken')
      .mockResolvedValue({ success: true, status: '' })

    mountMagicLink()
    await flushPromises()

    expect(verifyToken).toHaveBeenCalledWith('123456')
    expect(replace).toHaveBeenCalledWith('/browse')
  })

  it('shows only a spinner, not the captcha prompt, while continuing on its own', async () => {
    route.query = { token: '123456' }
    localStorage.setItem('authId', 'test@example.com')
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'verifyToken').mockReturnValue(new Promise(() => {}))

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(wrapper.find('.auto-continue-spinner').exists()).toBe(true)
    expect(wrapper.findComponent(CaptchaWidget).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('auth.magic_link_prompt')
  })

  it('does not continue on its own when the token param is malformed', async () => {
    route.query = { token: '12' }
    localStorage.setItem('authId', 'test@example.com')
    const authStore = useAuthStore()
    const verifyToken = vi.spyOn(authStore, 'verifyToken')

    mountMagicLink()
    await flushPromises()

    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('verifies the token from the link once the captcha is solved', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    const verifyToken = vi
      .spyOn(authStore, 'verifyToken')
      .mockResolvedValue({ success: true, status: '' })

    await mountAndContinue()

    expect(verifyToken).toHaveBeenCalledOnce()
    expect(verifyToken).toHaveBeenCalledWith('123456')
  })

  it('shows check-email message when no token in query', async () => {
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(wrapper.text()).toContain('auth.token_check_email')
    expect(wrapper.text()).toContain('auth.token_check_junk')
  })

  it('shows the email address as entered in the check-email message', async () => {
    localStorage.setItem('authId', 'Entered@Example.com')

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(wrapper.text()).toContain(
      `auth.token_check_email ${JSON.stringify({ email: 'Entered@Example.com' })}`
    )
  })

  it('navigates back to login when "incorrect email?" link is clicked', async () => {
    localStorage.setItem('authId', 'test@example.com')

    const wrapper = mountMagicLink()
    await flushPromises()

    const link = wrapper.get('[data-testid="incorrect-email-link"]')
    expect(link.text()).toBe('auth.token_incorrect_email')
    expect(link.classes()).toContain('small')
    await link.trigger('click')

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'Login' }))
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

    const wrapper = await mountAndContinue()

    expect(wrapper.text()).not.toContain('auth.token_check_email')
    expect(wrapper.text()).not.toContain('auth.token_check_junk')
    expect(wrapper.text()).not.toContain('auth.token_check_messages')
    expect(wrapper.text()).toContain('auth.token_expired')
    expect(wrapper.text()).toContain('uicomponents.back_button_title')
  })

  it.each([
    ['AUTH_EXPIRED_TOKEN', 'auth.token_expired'],
    ['AUTH_INVALID_TOKEN', 'auth.token_invalid'],
    ['AUTH_INVALID_INPUT', 'auth.token_different_device'],
    ['AUTH_INTERNAL_ERROR', 'auth.token_unknown_error'],
  ] as const)('tracks auth-token-failed:%s', async (code, errorKey) => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({
      success: false,
      code,
      message: 'failed',
      restart: 'otp',
    })

    const wrapper = await mountAndContinue()

    expect(track).toHaveBeenCalledWith(`auth-token-failed:${code}`)
    expect(wrapper.text()).toContain(errorKey)
  })

  it('tracks auth-token-failed:AUTH_MALFORMED_LINK on malformed token param', async () => {
    route.query = { token: '12' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    const verifyToken = vi.spyOn(authStore, 'verifyToken')

    const wrapper = mountMagicLink()
    await flushPromises()

    expect(verifyToken).not.toHaveBeenCalled()
    expect(track).toHaveBeenCalledWith('auth-token-failed:AUTH_MALFORMED_LINK')
    expect(wrapper.text()).toContain('auth.token_invalid_link')
  })

  it('tracks auth-bootstrap-failed when bootstrap rejects after a valid token', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })
    bootstrapReady.mockRejectedValue(new Error('chunk load failed'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = await mountAndContinue()

    expect(track).toHaveBeenCalledWith('auth-bootstrap-failed')
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('auth.token_unknown_error')
    consoleError.mockRestore()
  })

  it('does not track failure events on successful login', async () => {
    route.query = { token: '123456' }
    const authStore = useAuthStore()
    authStore.loginUser = emailLoginUser
    vi.spyOn(authStore, 'verifyToken').mockResolvedValue({ success: true, status: '' })

    await mountAndContinue()

    expect(track).not.toHaveBeenCalled()
  })
})
