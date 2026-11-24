import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({ isLoggedIn: false, profileId: 'p1' as string | null }))
vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: () => authStore }))

// The device's onboarded hint and the profile the bootstrap loads.
const onboarding = vi.hoisted(() => ({
  known: true,
  profile: { isOnboarded: true } as { isOnboarded: boolean } | null,
  bootstrap: vi.fn(async () => {}),
}))
vi.mock('@/lib/onboardedHint', () => ({ isKnownOnboarded: () => onboarding.known }))
vi.mock('@/lib/bootstrap', () => ({ useBootstrap: () => ({ bootstrap: onboarding.bootstrap }) }))
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({ profile: onboarding.profile }),
}))

const stub = vi.hoisted(() => ({ default: { template: '<div />' } }))
vi.mock('@/features/app/views/OnboardingLayout.vue', () => stub)
vi.mock('@/features/onboarding/views/Onboarding.vue', () => stub)
vi.mock('@/features/auth/views/LoginView.vue', () => stub)
vi.mock('@/features/auth/views/MagicLink.vue', () => stub)
vi.mock('@/features/app/views/AppShellLayout.vue', () => stub)
vi.mock('@/features/browse/views/BrowseProfiles.vue', () => stub)
vi.mock('@/features/settings/views/AccountDeletedView.vue', () => stub)

import router from '../index'
import { bus } from '@/lib/bus'

describe('router auth guard', () => {
  beforeEach(async () => {
    onboarding.known = true
    onboarding.profile = { isOnboarded: true }
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

describe('router onboarding branch', () => {
  beforeEach(async () => {
    authStore.isLoggedIn = true
    onboarding.known = true
    onboarding.profile = { isOnboarded: true }
    await router.replace('/me')
    onboarding.bootstrap.mockClear()
  })

  it('routes a profile known to be onboarded without waiting for the profile', async () => {
    await router.push('/inbox')

    expect(router.currentRoute.value.name).toBe('Inbox')
    expect(onboarding.bootstrap).not.toHaveBeenCalled()
  })

  it('sends a profile known to be onboarded away from Onboarding', async () => {
    await router.push('/onboarding')

    expect(router.currentRoute.value.name).toBe('Browse')
  })

  it('sends a profile not yet onboarded to Onboarding without adding a history entry', async () => {
    onboarding.known = false
    onboarding.profile = { isOnboarded: false }

    const entries = window.history.length

    await router.push('/browse')

    expect(onboarding.bootstrap).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('Onboarding')
    // No history entry is added: back must not return to a page that bounces
    // straight into a fresh wizard.
    expect(window.history.length).toBe(entries)
  })

  it('waits for the profile on an unknown device and routes an onboarded profile normally', async () => {
    onboarding.known = false

    await router.push('/inbox')

    expect(onboarding.bootstrap).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('Inbox')
  })

  it('does not redirect when the profile could not be loaded', async () => {
    onboarding.known = false
    onboarding.profile = null

    await router.push('/inbox')

    expect(router.currentRoute.value.name).toBe('Inbox')
  })
})
