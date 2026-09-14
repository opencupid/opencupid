import { describe, expect, it } from 'vitest'
import { fallbackLocale, resolveLocale } from '@shared/i18n/locales'

describe('resolveLocale', () => {
  it('passes through a supported locale', () => {
    expect(resolveLocale('hu')).toBe('hu')
    expect(resolveLocale('en')).toBe('en')
  })

  it('narrows a region-tagged locale to its supported base', () => {
    expect(resolveLocale('hu-HU')).toBe('hu')
    expect(resolveLocale('en-GB')).toBe('en')
  })

  // User.language is unvalidated at both write boundaries, so anything can be
  // stored. i18next renders such a value in fallbackLocale; callers that
  // advertise the language must agree with what was rendered.
  it('falls back for an unsupported locale', () => {
    expect(resolveLocale('zz')).toBe(fallbackLocale)
    expect(resolveLocale('de-AT')).toBe(fallbackLocale)
    expect(resolveLocale('')).toBe(fallbackLocale)
  })

  // appLocales is a plain object, so a naive `in` check would report prototype
  // members as supported for attacker-chosen values.
  it('does not treat Object prototype members as locales', () => {
    expect(resolveLocale('constructor')).toBe(fallbackLocale)
    expect(resolveLocale('toString')).toBe(fallbackLocale)
    expect(resolveLocale('__proto__')).toBe(fallbackLocale)
  })
})
