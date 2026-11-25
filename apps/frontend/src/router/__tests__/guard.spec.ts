import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({ isLoggedIn: false }))
vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: () => authStore }))

const stub = vi.hoisted(() => ({ default: { template: '<div />' } }))
vi.mock('@/features/app/views/OnboardingLayout.vue', () => stub)
vi.mock('@/features/auth/views/LoginView.vue', () => stub)
vi.mock('@/features/auth/views/MagicLink.vue', () => stub)
vi.mock('@/features/app/views/AppShellLayout.vue', () => stub)
vi.mock('@/features/browse/views/BrowseProfiles.vue', () => stub)
vi.mock('@/features/settings/views/AccountDeletedView.vue', () => stub)
vi.mock('@/features/onboarding/views/Onboarding.vue', () => stub)

import router from '../index'
import { bus } from '@/lib/bus'

describe('router auth guard', () => {
  beforeEach(async () => {
    authStore.isLoggedIn = true
    await router.replace('/browse')
    authStore.isLoggedIn = false
  })

  it('sends a logged-out visitor to Login, remembering the deep link', async () => {
    await router.push('/inbox/abc')

    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.query).toEqual({ redirect: '/inbox/abc' })
  })

  it('keeps UTM tags when sending a logged-out visitor to Login', async () => {
    await router.push('/browse?utm_source=notification&utm_campaign=nearby_digest')

    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.query).toEqual({
      utm_source: 'notification',
      utm_campaign: 'nearby_digest',
    })
  })

  it('sends a logged-out visitor of the landing page to a plain Login', async () => {
    authStore.isLoggedIn = true
    await router.push('/me')
    authStore.isLoggedIn = false

    await router.push('/')

    expect(router.currentRoute.value.fullPath).toBe('/auth')
  })

  it('returns to the current page after the session expires', async () => {
    authStore.isLoggedIn = true
    await router.push('/inbox/abc')
    authStore.isLoggedIn = false

    bus.emit('auth:logged-out', { expired: true })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('Login'))

    expect(router.currentRoute.value.query).toEqual({ redirect: '/inbox/abc' })
  })

  it('leaves navigation to the caller after an explicit logout', async () => {
    authStore.isLoggedIn = true
    await router.push('/me/settings')
    authStore.isLoggedIn = false

    // Closing the account: logout, then the exit survey.
    bus.emit('auth:logged-out', { expired: false })
    await router.push({ name: 'AccountDeleted' })
    await new Promise((resolve) => setTimeout(resolve))

    expect(router.currentRoute.value.name).toBe('AccountDeleted')
  })
})

describe('router onboarding gate', () => {
  const setPending = (pending: boolean) => {
    const body = btoa(JSON.stringify({ userId: 'u1', ...(pending && { pending: true }) }))
    document.cookie = `__session=header.${body}.signature; path=/`
  }

  beforeEach(async () => {
    // A pending user arrives from a logged-out page, never from Browse.
    authStore.isLoggedIn = false
    await router.replace('/auth')
    authStore.isLoggedIn = true
  })

  afterEach(() => {
    document.cookie = '__session=; path=/; max-age=0'
    authStore.isLoggedIn = false
  })

  it.each(['/browse', '/me', '/inbox/abc', '/magic-link'])(
    'sends a pending user from %s to Onboarding',
    async (path) => {
      setPending(true)
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('Onboarding')
    }
  )

  it('replaces the history entry', async () => {
    const entries = window.history.length
    setPending(true)
    await router.push('/me')

    expect(router.currentRoute.value.name).toBe('Onboarding')
    expect(window.history.length).toBe(entries)
  })

  it('stays on Onboarding when going back to the login page', async () => {
    authStore.isLoggedIn = false
    await router.push('/magic-link')
    authStore.isLoggedIn = true
    setPending(true)
    await router.replace('/browse')
    expect(router.currentRoute.value.name).toBe('Onboarding')

    const settled = new Promise((resolve) => {
      const stop = router.afterEach((to, _from, failure) => {
        if (failure) return
        stop()
        resolve(to.name)
      })
    })
    router.back()
    expect(await settled).toBe('Onboarding')
  })

  it('opens Browse as soon as the token has been replaced', async () => {
    setPending(true)
    await router.push('/browse/grid')
    expect(router.currentRoute.value.name).toBe('Onboarding')

    setPending(false)
    await router.replace({ name: 'Browse' })
    expect(router.currentRoute.value.name).toBe('Browse')
  })

  it('sends a logged-out visitor to Login even if a pending cookie is left over', async () => {
    authStore.isLoggedIn = false
    setPending(true)
    await router.push('/me')
    expect(router.currentRoute.value.name).toBe('Login')
  })
})
