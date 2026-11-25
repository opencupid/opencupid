import { afterEach, describe, expect, it } from 'vitest'
import { onboardingRedirect } from '../onboardingGate'

function setSession(payload: object | string) {
  const body = typeof payload === 'string' ? payload : btoa(JSON.stringify(payload))
  document.cookie = `__session=header.${body}.signature; path=/`
}

const browse = { name: 'Browse', meta: { requiresAuth: true }, query: {} }
const toOnboarding = { name: 'Onboarding', query: {}, replace: true }

describe('onboardingRedirect', () => {
  afterEach(() => {
    document.cookie = '__session=; path=/; max-age=0'
  })

  it('sends a pending user to Onboarding', () => {
    setSession({ userId: 'u1', pending: true })
    expect(onboardingRedirect(browse)).toEqual(toOnboarding)
  })

  it('lets through a token without the claim', () => {
    setSession({ userId: 'u1' })
    expect(onboardingRedirect(browse)).toBeUndefined()
  })

  it('lets a pending user reach Onboarding and public pages', () => {
    setSession({ userId: 'u1', pending: true })
    expect(onboardingRedirect({ ...browse, name: 'Onboarding' })).toBeUndefined()
    expect(
      onboardingRedirect({ name: 'Unsubscribe', meta: { requiresAuth: false }, query: {} })
    ).toBeUndefined()
  })

  it('follows the cookie when the token is replaced', () => {
    setSession({ userId: 'u1', pending: true })
    expect(onboardingRedirect(browse)).toEqual(toOnboarding)
    setSession({ userId: 'u1' })
    expect(onboardingRedirect(browse)).toBeUndefined()
  })

  it('carries over only UTM tags', () => {
    setSession({ userId: 'u1', pending: true })
    expect(
      onboardingRedirect({ ...browse, query: { utm_source: 'email', tags: 'a' } })
    ).toMatchObject({ query: { utm_source: 'email' } })
  })

  it.each(['not-base64!', btoa('not json')])('lets through a malformed token (%s)', (body) => {
    setSession(body)
    expect(onboardingRedirect(browse)).toBeUndefined()
  })

  it('lets through without a session cookie', () => {
    expect(onboardingRedirect(browse)).toBeUndefined()
  })
})
