import { describe, it, expect } from 'vitest'
import { shouldShowLandingPage } from '@/lib/bootstrapRoute'

describe('shouldShowLandingPage', () => {
  it('returns true for root path without token', () => {
    expect(shouldShowLandingPage('/', false)).toBe(true)
  })

  it('returns false for root path with token (authenticated user)', () => {
    expect(shouldShowLandingPage('/', true)).toBe(false)
  })

  it('returns false for non-root path without token', () => {
    expect(shouldShowLandingPage('/home', false)).toBe(false)
  })

  it('returns false for non-root path with token', () => {
    expect(shouldShowLandingPage('/home', true)).toBe(false)
  })
})
