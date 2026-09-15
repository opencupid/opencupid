import i18next from 'i18next'
import ICU from 'i18next-icu'
import FsBackend from 'i18next-fs-backend'
import path from 'path'
import { appLocales, resolveFallbackLocale } from '@shared/i18n/locales'
import { appConfig } from './appconfig'

const translationsPath = path.join(
  __dirname,
  __dirname.includes('dist') ? '../../..' : '../../../../',
  'packages',
  'shared',
  'i18n',
  '{{lng}}.json'
)

i18next
  .use(ICU)
  .use(FsBackend)
  .init({
    fallbackLng: resolveFallbackLocale(appConfig.FALLBACK_LOCALE),
    preload: Object.keys(appLocales),
    initImmediate: false,
    showSupportNotice: false,
    backend: {
      loadPath: translationsPath,
    },
  })
