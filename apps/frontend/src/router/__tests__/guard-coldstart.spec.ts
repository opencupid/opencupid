import { describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({ isLoggedIn: true }))
vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: () => authStore }))

const stub = vi.hoisted(() => ({ default: { template: '<div />' } }))
vi.mock('@/features/app/views/OnboardingLayout.vue', () => stub)
vi.mock('@/features/auth/views/LoginView.vue', () => stub)
vi.mock('@/features/auth/views/MagicLink.vue', () => stub)
vi.mock('@/features/browse/views/BrowseProfiles.vue', () => stub)

// The lazy authenticated shell stays "loading" until the test releases it.
const shell = vi.hoisted(() => {
  let release!: () => void
  const loaded = new Promise<void>((resolve) => (release = resolve))
  return { loaded, release }
})
vi.mock('@/features/app/views/AppShellLayout.vue', async () => {
  await shell.loaded
  return stub
})

import router from '../index'
import { bus } from '@/lib/bus'

describe('router cold start with a stale session', () => {
  it('remembers the deep link when the session expires while the route is still loading', async () => {
    const initialNavigation = router.push('/inbox/abc')

    // Refresh fails before the lazy route components have loaded.
    authStore.isLoggedIn = false
    bus.emit('auth:logged-out', { expired: true })

    shell.release()
    await initialNavigation
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('Login'))

    expect(router.currentRoute.value.query).toEqual({ redirect: '/inbox/abc' })
  })
})
