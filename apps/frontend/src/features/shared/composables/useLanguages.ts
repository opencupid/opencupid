import { type MultiselectOption } from '@/types/multiselect'
import languages from '@cospired/i18n-iso-languages'
import { activeLocale } from '@/lib/tolgee'

// https://www.npmjs.com/package/@cospired/i18n-iso-languages

// Every locale in appLocales has its name catalog bundled here, so the
// active locale is always registered and nothing has to be loaded, or kept
// in sync, at runtime.
import enLang from '@cospired/i18n-iso-languages/langs/en.json'
import huLang from '@cospired/i18n-iso-languages/langs/hu.json'
languages.registerLocale(enLang)
languages.registerLocale(huLang)

export function useLanguages() {
  const labelsFor = (codes: string[]) => {
    const langs = languages.getNames(activeLocale.value)
    const englishLangs = languages.getNames('en')
    return codes.map((code) => ({
      value: code,
      label: langs[code] || englishLangs[code] || code,
    }))
  }

  const getLanguageSelectorOptions = (): MultiselectOption[] =>
    labelsFor(Object.keys(languages.getNames(activeLocale.value)))

  const getLanguageLabels = (codes: string[]) => labelsFor(codes)

  return {
    getLanguageSelectorOptions,
    getLanguageLabels,
  }
}
