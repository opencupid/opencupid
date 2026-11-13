import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({ isLoggedIn: false }))
vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: () => authStore }))

const stub = vi.hoisted(() => ({ default: { template: '<div />' } }))
vi.mock('@/features/app/views/OnboardingLayout.vue', () => stub)
vi.mock('@/features/auth/views/LoginView.vue', () => stub)
vi.mock('@/features/auth/views/MagicLink.vue', () => stub)
vi.mock('@/features/app/views/AppShellLayout.vue', () => stub)
vi.mock('@/features/browse/views/BrowseProfiles.vue', () => stub)

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

  it('goes to a plain Login after an explicit logout', async () => {
    authStore.isLoggedIn = true
    await router.push('/me/settings')
    authStore.isLoggedIn = false

    bus.emit('auth:logged-out', { expired: false })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('Login'))

    expect(router.currentRoute.value.fullPath).toBe('/auth')
  })
})
