import { describe, expect, it } from 'vitest'
import {
  fallbackLocale,
  isSupportedLocale,
  negotiateLocale,
  normalizeLocale,
  resolveFallbackLocale,
} from '@shared/i18n/locales'

describe('normalizeLocale', () => {
  it('passes through a supported locale', () => {
    expect(normalizeLocale('hu', fallbackLocale)).toBe('hu')
    expect(normalizeLocale('en', fallbackLocale)).toBe('en')
  })

  it('narrows a region-tagged locale to its supported base', () => {
    expect(normalizeLocale('hu-HU', fallbackLocale)).toBe('hu')
    expect(normalizeLocale('en-GB', fallbackLocale)).toBe('en')
  })

  it('falls back for an unsupported locale', () => {
    expect(normalizeLocale('zz', fallbackLocale)).toBe(fallbackLocale)
    expect(normalizeLocale('de-AT', fallbackLocale)).toBe(fallbackLocale)
    expect(normalizeLocale('', fallbackLocale)).toBe(fallbackLocale)
  })

  // Set membership, not `in` or index access on appLocales: both report
  // prototype members as supported for attacker-chosen values.
  it('does not treat Object prototype members as locales', () => {
    expect(normalizeLocale('constructor', fallbackLocale)).toBe(fallbackLocale)
    expect(normalizeLocale('toString', fallbackLocale)).toBe(fallbackLocale)
    expect(normalizeLocale('__proto__', fallbackLocale)).toBe(fallbackLocale)
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

describe('isSupportedLocale', () => {
  it('accepts only locales with translations', () => {
    expect(isSupportedLocale('en')).toBe(true)
    expect(isSupportedLocale('hu')).toBe(true)
    expect(isSupportedLocale('de')).toBe(false)
    // Exact membership: a region tag has no catalog of its own.
    expect(isSupportedLocale('hu-HU')).toBe(false)
  })

  it('does not treat Object prototype members as locales', () => {
    expect(isSupportedLocale('constructor')).toBe(false)
    expect(isSupportedLocale('__proto__')).toBe(false)
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

describe('negotiateLocale', () => {
  it('takes the most preferred supported locale', () => {
    expect(negotiateLocale(['hu', 'en'], fallbackLocale)).toBe('hu')
    expect(negotiateLocale(['en', 'hu'], fallbackLocale)).toBe('en')
  })

  // The case from #995: only the first entry was consulted before, so this
  // resolved to the fallback instead of the user's third preference.
  it('walks past unsupported preferences to a supported one', () => {
    expect(negotiateLocale(['de-AT', 'de', 'en'], fallbackLocale)).toBe('en')
    expect(negotiateLocale(['zz', 'hu'], fallbackLocale)).toBe('hu')
  })

  it('narrows a region-tagged preference to its supported base', () => {
    expect(negotiateLocale(['hu-HU', 'en'], fallbackLocale)).toBe('hu')
  })

  // Each tag is resolved fully before moving on, so a most-preferred en-GB
  // yields English rather than handing that visitor a later exact match.
  it('prefers narrowing an earlier tag over an exact later one', () => {
    expect(negotiateLocale(['en-GB', 'hu'], fallbackLocale)).toBe('en')
  })

  it('falls back when no preference is supported', () => {
    expect(negotiateLocale(['de', 'fr'], fallbackLocale)).toBe(fallbackLocale)
    expect(negotiateLocale([], fallbackLocale)).toBe(fallbackLocale)
  })

  it('applies the configured fallback when no preference is supported', () => {
    expect(negotiateLocale(['de', 'fr'], 'hu')).toBe('hu')
    expect(negotiateLocale([], 'hu')).toBe('hu')
  })

  it('degrades a configured fallback that has no translations', () => {
    expect(negotiateLocale(['de'], '')).toBe(fallbackLocale)
    expect(negotiateLocale(['de'], 'fr')).toBe(fallbackLocale)
  })

  it('does not treat Object prototype members as locales', () => {
    expect(negotiateLocale(['constructor', 'toString'], fallbackLocale)).toBe(fallbackLocale)
    expect(negotiateLocale(['de'], '__proto__')).toBe(fallbackLocale)
  })
})
