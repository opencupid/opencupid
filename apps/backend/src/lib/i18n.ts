
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

// TODO consolidate this with frontend i18n store
// move it out to packages/shared/i18n.ts
const labels: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  sk: 'Slovenčina',
  pl: 'Polski',
  ro: 'Română',
  nl: 'Nederlands',
}


i18next
  .use(FsBackend)
  .init({
    fallbackLng: 'en',
    preload: Object.keys(labels),
    initImmediate: false,
    backend: {
      loadPath: translationsPath,
    },
  })