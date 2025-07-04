
import i18next from 'i18next'
import FsBackend from 'i18next-fs-backend'
import path from 'path'
const translationsPath = path.join(
  __dirname,
  __dirname.includes('dist') ? '../../..' : '../../../../',
  'packages',
  'shared',
  'i18n',
  '{{lng}}.json'
)

i18next
  .use(FsBackend)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'de', 'fr', 'hu'],
    initImmediate: false,
    backend: {
      loadPath: translationsPath,
    },
  })