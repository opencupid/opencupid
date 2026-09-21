import type { App } from 'vue'
import { computed } from 'vue'
import { VueTolgee, useTranslate } from '@tolgee/vue'
import type { CombinedOptions, DefaultParamType } from '@tolgee/vue'
import { Settings } from 'luxon'
import { fallbackLocale } from '@shared/i18n/locales'
import { useLocalStore } from '@/store/localStore'
import { bus } from './bus'
import { activeLocale, tolgee } from './tolgee'

type TolgeeParams = CombinedOptions<DefaultParamType>

// TODO move this to config
Settings.defaultZone = 'Europe/Berlin'

// Compatibility type for MessageReceivedToast.vue
export type Composer = {
  t: (key: string, paramsOrDefault?: TolgeeParams | string) => string
}

declare global {
  interface Window {
    __APP_I18N__?: { global: Composer }
  }
}

/**
 * Compatibility shim for vue-i18n's useI18n().
 * Returns { t, locale } backed by Tolgee's useTranslate() and activeLocale.
 */
export function useI18n() {
  const { t: tolgeeT } = useTranslate()

  const locale = computed({
    get: () => activeLocale.value,
    set: (lang: string) => {
      tolgee.changeLanguage(lang)
    },
  })

  const t = (key: string, paramsOrDefault?: TolgeeParams | string): string => {
    if (typeof paramsOrDefault === 'string') {
      return tolgeeT.value(key, paramsOrDefault)
    }

    return tolgeeT.value(key, paramsOrDefault)
  }

  return { t, locale }
}

export function sortLanguagesWithDefaultFirst(codes: string[], defaultLang: string): string[] {
  return codes.slice().sort((a, b) => {
    if (a === defaultLang) return -1
    if (b === defaultLang) return 1
    return a.localeCompare(b)
  })
}

export function getLocale(): string | null {
  const localStore = useLocalStore()
  return localStore.getLanguage
}

let languageListenerAttached = false

function createGlobalT() {
  return (key: string, paramsOrDefault?: TolgeeParams | string): string => {
    if (typeof paramsOrDefault === 'string') {
      return tolgee.t(key, paramsOrDefault)
    }

    return tolgee.t(key, undefined, paramsOrDefault)
  }
}

export function appUseI18n(app: App) {
  app.use(VueTolgee, { tolgee })

  // Expose global t for non-component contexts (e.g. MessageReceivedToast)
  const globalT = createGlobalT()
  window.__APP_I18N__ = { global: { t: globalT } }

  const initialLocale = getLocale() ?? fallbackLocale
  tolgee.changeLanguage(initialLocale)
  Settings.defaultLocale = initialLocale

  // Start the Tolgee observer (enables in-context editing via Chrome Plugin)
  tolgee.run()

  if (!languageListenerAttached) {
    bus.on('language:changed', ({ language }: { language: string }) => {
      tolgee.changeLanguage(language)
      Settings.defaultLocale = language
    })
    languageListenerAttached = true
  }
}
