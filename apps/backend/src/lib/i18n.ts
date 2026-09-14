import i18next from 'i18next'
import ICU from 'i18next-icu'
import FsBackend from 'i18next-fs-backend'
import path from 'path'
import { appLocales, normalizeLocale } from '@shared/i18n/locales'
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
    fallbackLng: normalizeLocale(appConfig.FALLBACK_LOCALE),
    preload: Object.keys(appLocales),
    initImmediate: false,
    showSupportNotice: false,
    backend: {
      loadPath: translationsPath,
    },
  })
