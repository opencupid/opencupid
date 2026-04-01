import i18next from 'i18next'
import ICU from 'i18next-icu'
import FsBackend from 'i18next-fs-backend'
import path from 'path'
import { appLocales } from '@shared/i18n/locales'

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
    fallbackLng: 'en',
    preload: Object.keys(appLocales),
    initImmediate: false,
    showSupportNotice: false,
    backend: {
      loadPath: translationsPath,
    },
  })
