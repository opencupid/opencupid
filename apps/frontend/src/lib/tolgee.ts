import { Tolgee, DevTools } from '@tolgee/vue'
import type { TolgeeStaticData } from '@tolgee/vue'
import { FormatIcu } from '@tolgee/format-icu'

import en from '@shared/i18n/en.json'

const lazyLocales = import.meta.glob(['@shared/i18n/*.json', '!@shared/i18n/en.json'], {
  import: 'default',
})

const LOCALE_FILE_REGEX = /([\w-]+)\.json$/

const staticData: TolgeeStaticData = { en: en as TolgeeStaticData[string] }
const availableLanguages = ['en']

for (const path of Object.keys(lazyLocales)) {
  const locale = path.match(LOCALE_FILE_REGEX)?.[1]
  if (locale) {
    availableLanguages.push(locale)
    staticData[locale] = (() => lazyLocales[path]!()) as TolgeeStaticData[string]
  }
}

export { staticData, availableLanguages }

export const tolgee = Tolgee().use(DevTools()).use(FormatIcu()).init({
  language: 'en',
  staticData,
  availableLanguages,
})
