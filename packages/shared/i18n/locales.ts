export const appLocales: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
}

/** Locale used when a requested one has no translations. */
export const fallbackLocale = 'en'

const supportedLocales = new Set(Object.keys(appLocales))

/**
 * Normalize a language tag to a supported locale: exact match, then base tag
 * (`hu-HU` → `hu`), else fallbackLocale.
 *
 * Set membership rather than `in` or index access on `appLocales`: it's a
 * plain object, so both report `constructor`/`toString` as supported locales
 * for attacker-chosen input.
 */
export function normalizeLocale(language: string): string {
  const candidates = [language, ...language.split('-', 1)]
  return candidates.find((code) => supportedLocales.has(code)) ?? fallbackLocale
}
