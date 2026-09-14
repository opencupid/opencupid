export const appLocales: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
}

/** Locale used when a requested one has no translations. */
export const fallbackLocale = 'en'

/**
 * Resolve a requested language to the locale its content will actually render
 * in, mirroring how i18next walks `hu-HU` → `hu` → fallbackLocale.
 *
 * `User.language` is not constrained to `appLocales` at its write boundaries
 * (both UserIdentifyPayloadSchema and UpdateUserLanguagePayloadSchema accept
 * arbitrary strings), so callers must not assume a stored value is supported.
 * Anything advertising the requested language rather than the rendered one —
 * `<html lang>` on an email, say — has to resolve it first or it will
 * misdescribe its own content.
 */
export function resolveLocale(language: string): string {
  // hasOwnProperty.call, not `in`: appLocales is a plain object, so `in` would
  // report prototype members ('constructor', 'toString') as supported locales.
  const supported = (code: string) => Object.prototype.hasOwnProperty.call(appLocales, code)
  if (supported(language)) return language
  const [base] = language.split('-')
  if (base !== undefined && supported(base)) return base
  return fallbackLocale
}
