import { describe, expect, it } from 'vitest'
import { fallbackLocale, normalizeLocale } from '@shared/i18n/locales'

describe('normalizeLocale', () => {
  it('passes through a supported locale', () => {
    expect(normalizeLocale('hu')).toBe('hu')
    expect(normalizeLocale('en')).toBe('en')
  })

  it('narrows a region-tagged locale to its supported base', () => {
    expect(normalizeLocale('hu-HU')).toBe('hu')
    expect(normalizeLocale('en-GB')).toBe('en')
  })

  it('falls back for an unsupported locale', () => {
    expect(normalizeLocale('zz')).toBe(fallbackLocale)
    expect(normalizeLocale('de-AT')).toBe(fallbackLocale)
    expect(normalizeLocale('')).toBe(fallbackLocale)
  })

  // Set membership, not `in` or index access on appLocales: both report
  // prototype members as supported for attacker-chosen values.
  it('does not treat Object prototype members as locales', () => {
    expect(normalizeLocale('constructor')).toBe(fallbackLocale)
    expect(normalizeLocale('toString')).toBe(fallbackLocale)
    expect(normalizeLocale('__proto__')).toBe(fallbackLocale)
  })
})
