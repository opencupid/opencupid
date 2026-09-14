import { describe, expect, it } from 'vitest'
import {
  fallbackLocale,
  isSupportedLocale,
  negotiateLocale,
  normalizeLocale,
} from '@shared/i18n/locales'

describe('isSupportedLocale', () => {
  it('accepts only locales with translations', () => {
    expect(isSupportedLocale('en')).toBe(true)
    expect(isSupportedLocale('hu')).toBe(true)
    expect(isSupportedLocale('de')).toBe(false)
    expect(isSupportedLocale('hu-HU')).toBe(false)
  })

  it('does not treat Object prototype members as locales', () => {
    expect(isSupportedLocale('constructor')).toBe(false)
    expect(isSupportedLocale('__proto__')).toBe(false)
  })
})

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

describe('negotiateLocale', () => {
  it('takes the most preferred supported locale', () => {
    expect(negotiateLocale(['hu', 'en'])).toBe('hu')
    expect(negotiateLocale(['en', 'hu'])).toBe('en')
  })

  it('skips unsupported preferences to reach a supported one', () => {
    expect(negotiateLocale(['de-AT', 'de', 'en'])).toBe('en')
    expect(negotiateLocale(['zz', 'hu'])).toBe('hu')
  })

  it('narrows a region-tagged preference to its supported base', () => {
    expect(negotiateLocale(['hu-HU', 'en'])).toBe('hu')
  })

  it('prefers an exact later match over narrowing an earlier one', () => {
    expect(negotiateLocale(['en-GB', 'hu'])).toBe('en')
  })

  it('falls back when no preference is supported', () => {
    expect(negotiateLocale(['de', 'fr'])).toBe(fallbackLocale)
    expect(negotiateLocale([])).toBe(fallbackLocale)
  })

  it('does not treat Object prototype members as locales', () => {
    expect(negotiateLocale(['constructor', 'toString'])).toBe(fallbackLocale)
  })
})

describe('configured fallback', () => {
  it('applies the given fallback instead of the default', () => {
    expect(normalizeLocale('zz', 'hu')).toBe('hu')
    expect(negotiateLocale(['de', 'fr'], 'hu')).toBe('hu')
  })

  it('does not override a supported match', () => {
    expect(normalizeLocale('en', 'hu')).toBe('en')
    expect(negotiateLocale(['en'], 'hu')).toBe('en')
  })
})
