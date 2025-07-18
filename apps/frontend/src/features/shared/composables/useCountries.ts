import countries from 'i18n-iso-countries'
import { bus } from '@/lib/bus';

import { useI18nStore } from '@/store/i18nStore'

// Always register English (fallback)
import enLocale from 'i18n-iso-countries/langs/en.json'
countries.registerLocale(enLocale)

const loadedLocales = new Set(['en'])

const localeLoaders: Record<string, () => Promise<any>> = {
  de: () => import('i18n-iso-countries/langs/de.json'),
  es: () => import('i18n-iso-countries/langs/es.json'),
  fr: () => import('i18n-iso-countries/langs/fr.json'),
  hu: () => import('i18n-iso-countries/langs/hu.json'),
  it: () => import('i18n-iso-countries/langs/it.json'),
  nl: () => import('i18n-iso-countries/langs/nl.json'),
  pl: () => import('i18n-iso-countries/langs/pl.json'),
  pt: () => import('i18n-iso-countries/langs/pt.json'),
  ro: () => import('i18n-iso-countries/langs/ro.json'),
  sk: () => import('i18n-iso-countries/langs/sk.json'),
};

let language = 'en'

// Lazy-register other languages only when first needed
async function ensureCountryLocale(locale: string) {
  if (loadedLocales.has(locale)) return

  const loader = localeLoaders[locale];
  if (!loader) {
    console.warn(`Unsupported locale: ${locale}`);
    return;
  }
  const mod = await loader();
  // console.log(`Registering country locale: ${locale}`, mod.default);
  countries.registerLocale(mod.default);
  loadedLocales.add(locale)
  language = locale
}


export async function initialize(locale: string) {
  await ensureCountryLocale(locale)
  bus.on('language:changed', async ({ language }) => {
    await useCountries().ensureCountryLocale(language);
  })
}

export function useCountries() {

  const getCountryOptions = () => {
    const list = countries.getNames(language, {
      select: 'official',
    })
    const options = Object.entries(list)
      .map(([code, name]) => ({ label: name, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return options
  }

  const countryCodeToName = (code: string) => {
    return countries.getName(code, language, { select: 'official' })
  }

  return {
    initialize,
    getCountryOptions,
    ensureCountryLocale,
    countryCodeToName,
  }
}
