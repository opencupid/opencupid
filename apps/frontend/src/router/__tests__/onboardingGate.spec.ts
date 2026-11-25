import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { onboardingRedirect } from '../onboardingGate'

// The redirects themselves are covered through the router in guard.spec.ts.
describe('onboardingRedirect', () => {
  beforeEach(() => {
    document.cookie = `__session=header.${btoa('{"pending":true}')}.signature; path=/`
  })

  afterEach(() => {
    document.cookie = '__session=; path=/; max-age=0'
  })

  it('carries over only UTM tags', () => {
    expect(
      onboardingRedirect({
        name: 'Browse',
        meta: { requiresAuth: true },
        query: { utm_source: 'email', tags: 'a' },
      })
    ).toEqual({ name: 'Onboarding', query: { utm_source: 'email' }, replace: true })
  })

  it('lets a pending user reach public pages', () => {
    expect(
      onboardingRedirect({ name: 'Unsubscribe', meta: { requiresAuth: false }, query: {} })
    ).toBeUndefined()
  })
})
