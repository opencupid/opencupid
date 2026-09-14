export const appLocales: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
}

/** Last-resort locale, used when a configured fallback has no translations. */
export const fallbackLocale = 'en'

const supportedLocales = new Set(Object.keys(appLocales))

/**
 * The supported locale for a language tag — exact match, then base tag
 * (`hu-HU` → `hu`) — or null when neither has translations.
 *
 * Set membership rather than `in` or index access on `appLocales`: it's a
 * plain object, so both report `constructor`/`toString` as supported.
 */
function matchLocale(language: string): string | null {
  const candidates = [language, ...language.split('-', 1)]
  return candidates.find((code) => supportedLocales.has(code)) ?? null
}

/** Whether a language tag names a locale that has translations. */
export function isSupportedLocale(language: string): boolean {
  return supportedLocales.has(language)
}

/**
 * Bound a configured fallback to a locale that has translations. Deployment
 * config is untrusted: `envsubst` writes an unset var as `''`, and nothing
 * validates the frontend's copy before it reaches the browser.
 */
export function resolveFallbackLocale(configured: string): string {
  return matchLocale(configured) ?? fallbackLocale
}

/** Normalize a language tag to a supported locale, else `fallback`. */
export function normalizeLocale(language: string, fallback: string): string {
  return matchLocale(language) ?? resolveFallbackLocale(fallback)
}

/**
 * The first supported locale among ordered language preferences, else
 * `fallback`. Suits `navigator.languages` and `Accept-Language`: a miss on the
 * most-preferred tag tries the next, so `['de-AT', 'de', 'en']` yields `en`.
 */
export function negotiateLocale(languages: readonly string[], fallback: string): string {
  for (const language of languages) {
    const match = matchLocale(language)
    if (match) return match
  }
  return resolveFallbackLocale(fallback)
}
