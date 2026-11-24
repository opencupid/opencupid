import { beforeEach, describe, expect, it } from 'vitest'
import { isKnownOnboarded, recordOnboarded } from '../onboardedHint'

describe('onboardedHint', () => {
  beforeEach(() => localStorage.clear())

  it('knows nothing on a fresh device', () => {
    expect(isKnownOnboarded('p1')).toBe(false)
  })

  it('knows a profile once it has been seen onboarded', () => {
    recordOnboarded({ id: 'p1', isOnboarded: true })

    expect(isKnownOnboarded('p1')).toBe(true)
  })

  it('knows nothing about another profile on the same device', () => {
    recordOnboarded({ id: 'p1', isOnboarded: true })

    expect(isKnownOnboarded('p2')).toBe(false)
    expect(isKnownOnboarded(null)).toBe(false)
  })

  it('forgets a profile the server reports as not onboarded', () => {
    recordOnboarded({ id: 'p1', isOnboarded: true })
    recordOnboarded({ id: 'p1', isOnboarded: false })

    expect(isKnownOnboarded('p1')).toBe(false)
  })

  it("keeps another profile's entry when a not-onboarded profile is seen", () => {
    recordOnboarded({ id: 'p1', isOnboarded: true })
    recordOnboarded({ id: 'p2', isOnboarded: false })

    expect(isKnownOnboarded('p1')).toBe(true)
  })
})
