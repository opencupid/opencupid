import { Tolgee, DevTools } from '@tolgee/vue'
import type { TolgeeStaticData } from '@tolgee/vue'
import { FormatIcu } from '@tolgee/format-icu'

// Locale files are statically imported so they are bundled into the main chunk
// rather than emitted as separate content-hashed files. Lazy loading would
// cause a 404 when a user runs a stale cached bundle after a new deployment
// has replaced the old hashed filenames on the server.
// TODO: if more locales are added and bundle size becomes a concern, switch to
// lazy loading and add a RecordFetchError handler that falls back to 'en' and
// triggers window.location.reload() so stale bundles self-heal.
import en from '@shared/i18n/en.json'
import hu from '@shared/i18n/hu.json'

export const availableLanguages = ['en', 'hu']

export const staticData: TolgeeStaticData = {
  en: en as TolgeeStaticData[string],
  hu: hu as TolgeeStaticData[string],
}

export const tolgee = Tolgee().use(DevTools()).use(FormatIcu()).init({
  language: 'en',
  staticData,
  availableLanguages,
})
