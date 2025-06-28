import { bus } from '@/lib/bus';
import {type  MultiselectOption } from '@/types/multiselect';
import languages from '@cospired/i18n-iso-languages'

// https://www.npmjs.com/package/@cospired/i18n-iso-languages

// const localeModules = import.meta.glob<{ default: any }>(
//   './src/node_modules/i18n-iso-languages/langs/*.json',
//   { eager: true }
// );

// async function registerLocales() {
//   for (const locale of getAvailableLocales()) {
//     const path = `@cospired/i18n-iso-languages/langs/${locale}.json`;
//     const lang = localeModules[path];
//     if (lang && lang.default) {
//       languages.registerLocale(lang.default);
//     }
//   }
// }

let language = 'en'



const localeLoaders: Record<string, () => Promise<any>> = {
  hu: () => import('@cospired/i18n-iso-languages/langs/hu.json'),
  fr: () => import('@cospired/i18n-iso-languages/langs/fr.json'),
  de: () => import('@cospired/i18n-iso-languages/langs/de.json'),
  it: () => import('@cospired/i18n-iso-languages/langs/it.json'),
};
const loadedLocales = new Set(['en'])

import lang from '@cospired/i18n-iso-languages/langs/en.json'
languages.registerLocale(lang)

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
  languages.registerLocale(mod.default);
  loadedLocales.add(locale)
  language = locale
}

export async function initialize(locale: string) {
  await ensureCountryLocale(locale)
  bus.on('language:changed', async ({ language }) => {
    await useLanguages().ensureCountryLocale(language);
  })
}


export function useLanguages() {
  const getLanguageSelectorOptions = (): MultiselectOption[] => {
    const langs = languages.getNames(language)
    // console.log('Registering locales:', langs);
    return Object.keys(langs).map((code, label) => ({
      value: code,
      label: langs[code],
    }))
  }

  const getLanguageList = (codes: string[]) => {
    if (!codes) {
      return []
    }
    const langs = languages.getNames(language)
    return codes.map(code => ({
      value: code,
      label: langs[code] || code,
    }))
  }
  return {
    initialize,
    ensureCountryLocale,
    getLanguageSelectorOptions,
    getLanguageList,
  }
}
