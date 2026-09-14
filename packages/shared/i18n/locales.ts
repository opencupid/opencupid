export const appLocales: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
}

/** Locale used when a requested one has no translations. */
export const fallbackLocale = 'en'

const supportedLocales = new Set(Object.keys(appLocales))

/**
 * Normalize a language tag to a supported locale: exact match, then base tag
 * (`hu-HU` → `hu`), else `fallback`.
 *
 * Set membership rather than `in` or index access on `appLocales`: it's a
 * plain object, so both report `constructor`/`toString` as supported locales
 * for attacker-chosen input.
 *
 * `fallback` is treated as untrusted: it arrives from deployment config that
 * nothing validates — the frontend's reaches the browser through `envsubst`,
 * which writes an unset var as `''` — and returning it unchecked would leave
 * the caller with a locale that has no catalog.
 */
export function normalizeLocale(language: string, fallback: string = fallbackLocale): string {
  const candidates = [language, ...language.split('-', 1), fallback]
  return candidates.find((code) => supportedLocales.has(code)) ?? fallbackLocale
}
