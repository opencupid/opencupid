import countries from 'i18n-iso-countries'
import { activeLocale } from '@/lib/tolgee'

// Every locale in appLocales has its name catalog bundled here, so the
// active locale is always registered and nothing has to be loaded, or kept
// in sync, at runtime.
import enLocale from 'i18n-iso-countries/langs/en.json'
import huLocale from 'i18n-iso-countries/langs/hu.json'
countries.registerLocale(enLocale)
countries.registerLocale(huLocale)

export function useCountries() {
  const getCountryOptions = () => {
    const list = countries.getNames(activeLocale.value, {
      select: 'official',
    })
    const options = Object.entries(list)
      .map(([code, name]) => ({ label: name, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return options
  }

  const countryCodeToName = (code: string) => {
    return countries.getName(code, activeLocale.value, { select: 'official' })
  }

  return {
    getCountryOptions,
    countryCodeToName,
  }
}
