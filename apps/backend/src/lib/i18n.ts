import i18next, { type i18n, type TFunction } from 'i18next'
import ICU from 'i18next-icu'
import FsBackend from 'i18next-fs-backend'
import path from 'path'
import { appLocales } from '@shared/i18n/locales'
import type { Brand } from './appconfig'

const translationsPath = path.join(
  __dirname,
  __dirname.includes('dist') ? '../../..' : '../../../../',
  'packages',
  'shared',
  'i18n',
  '{{lng}}.json'
)

/**
 * One i18next instance per brand, initialized with that brand's fallback
 * locale. A per-call fallback (getFixedT([lng, fallback]) or the fallbackLng
 * option) resolves differently depending on the instance's current language,
 * so the fallback is fixed at init instead. initImmediate: false with the fs
 * backend loads the catalogs synchronously, so an instance is ready on return.
 */
const brandInstances = new Map<string, i18n>()

function brandInstance(brand: Brand): i18n {
  let instance = brandInstances.get(brand.domain)
  if (!instance) {
    instance = i18next.createInstance()
    instance
      .use(ICU)
      .use(FsBackend)
      .init({
        fallbackLng: brand.fallbackLocale,
        preload: Object.keys(appLocales),
        initImmediate: false,
        showSupportNotice: false,
        backend: { loadPath: translationsPath },
      })
    brandInstances.set(brand.domain, instance)
  }
  return instance
}

/**
 * A translator for `language` that falls back to the brand's locale for
 * strings missing in it (or for a language without translations).
 */
export function tFor(brand: Brand, language: string): TFunction {
  return brandInstance(brand).getFixedT(language)
}
