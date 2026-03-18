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

// Preserve the Tolgee singleton across HMR updates so translation edits
// are reflected without a full page reload.
export const tolgee: ReturnType<ReturnType<typeof Tolgee>['init']> =
  import.meta.hot?.data?.tolgee ??
  Tolgee().use(DevTools()).use(FormatIcu()).init({
    language: 'en',
    staticData,
    availableLanguages,
  })

if (import.meta.hot?.data) {
  import.meta.hot.data.tolgee = tolgee

  // Accept each locale JSON dependency directly so Vite hands us the
  // freshly-updated module, avoiding a stale closure over the top-level imports.
  import.meta.hot.accept('@shared/i18n/en.json', (freshEn) => {
    if (!freshEn) return
    tolgee.addStaticData({ en: freshEn.default as TolgeeStaticData[string] })
  })

  import.meta.hot.accept('@shared/i18n/hu.json', (freshHu) => {
    if (!freshHu) return
    tolgee.addStaticData({ hu: freshHu.default as TolgeeStaticData[string] })
  })
}
