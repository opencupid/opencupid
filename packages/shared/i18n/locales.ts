export const appLocales: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
}

/**
 * Locale used when a requested one has no translations, for callers with no
 * configured value of their own. Each runtime reads `FALLBACK_LOCALE` from its
 * own config and passes it in; this is the schema default behind that.
 */
export const fallbackLocale = 'en'

const supportedLocales = new Set(Object.keys(appLocales))

/** Whether a locale has translations, i.e. is usable as a fallback. */
export function isSupportedLocale(language: string): boolean {
  return supportedLocales.has(language)
}

/**
 * The supported locale for a language tag — exact match, then base tag
 * (`hu-HU` → `hu`) — or null when none is supported.
 *
 * Set membership rather than `in` or index access on `appLocales`: it's a
 * plain object, so both report `constructor`/`toString` as supported locales
 * for attacker-chosen input.
 */
function matchLocale(language: string): string | null {
  const candidates = [language, ...language.split('-', 1)]
  return candidates.find((code) => supportedLocales.has(code)) ?? null
}

/** Normalize a language tag to a supported locale, else `fallback`. */
export function normalizeLocale(language: string, fallback: string = fallbackLocale): string {
  return matchLocale(language) ?? fallback
}

/**
 * The first supported locale among ordered language preferences, else
 * `fallback`. Suits `navigator.languages` and `Accept-Language`, where a miss
 * on the most-preferred tag should try the next rather than give up.
 */
export function negotiateLocale(
  languages: readonly string[],
  fallback: string = fallbackLocale
): string {
  for (const language of languages) {
    const match = matchLocale(language)
    if (match) return match
  }
  return fallback
}
