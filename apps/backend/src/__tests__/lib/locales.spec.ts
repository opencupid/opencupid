import { describe, expect, it } from 'vitest'
import { fallbackLocale, normalizeLocale, resolveFallbackLocale } from '@shared/i18n/locales'

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

describe('normalizeLocale with a configured fallback', () => {
  it('applies the configured fallback for an unsupported language', () => {
    expect(normalizeLocale('zz', 'hu')).toBe('hu')
    expect(normalizeLocale('', 'hu')).toBe('hu')
  })

  it('prefers a supported language over the fallback', () => {
    expect(normalizeLocale('en', 'hu')).toBe('en')
    expect(normalizeLocale('en-GB', 'hu')).toBe('en')
  })

  // The configured value is untrusted: envsubst writes an unset var as '',
  // and nothing validates it before it reaches here.
  it('degrades a fallback that has no translations', () => {
    expect(normalizeLocale('zz', 'de')).toBe(fallbackLocale)
    expect(normalizeLocale('zz', '')).toBe(fallbackLocale)
    expect(normalizeLocale('zz', '${FALLBACK_LOCALE}')).toBe(fallbackLocale)
  })

  it('does not accept an Object prototype member as the fallback', () => {
    expect(normalizeLocale('zz', 'constructor')).toBe(fallbackLocale)
    expect(normalizeLocale('zz', '__proto__')).toBe(fallbackLocale)
  })
})

describe('resolveFallbackLocale', () => {
  it('passes through a locale with translations', () => {
    expect(resolveFallbackLocale('hu')).toBe('hu')
    expect(resolveFallbackLocale('en')).toBe('en')
  })

  it('narrows a region-tagged configured locale to its supported base', () => {
    expect(resolveFallbackLocale('hu-HU')).toBe('hu')
  })

  it('degrades a configured locale that has no translations', () => {
    expect(resolveFallbackLocale('de')).toBe(fallbackLocale)
    expect(resolveFallbackLocale('')).toBe(fallbackLocale)
    expect(resolveFallbackLocale('${FALLBACK_LOCALE}')).toBe(fallbackLocale)
    expect(resolveFallbackLocale('constructor')).toBe(fallbackLocale)
  })

  // Backend i18next and the frontend store both read FALLBACK_LOCALE; a
  // region tag must not resolve to a different locale in each.
  it('agrees with normalizeLocale on a region-tagged fallback', () => {
    expect(normalizeLocale('zz', 'hu-HU')).toBe(resolveFallbackLocale('hu-HU'))
  })
})
