import type { App } from 'vue'
import { computed } from 'vue'
import { VueTolgee, useTranslate, useTolgee } from '@tolgee/vue'
import { Settings } from 'luxon'
import { useLocalStore } from '@/store/localStore'
import { bus } from './bus'
import { tolgee, staticData } from './tolgee'

Settings.defaultZone = 'Europe/Berlin'

// Re-export for external consumers
export const messages = staticData

// Compatibility type for MessageReceivedToast.vue
export type Composer = { t: (key: string, params?: Record<string, unknown>) => string }

declare global {
  interface Window {
    __APP_I18N__?: { global: Composer }
  }
}


// vue-i18n plural: "one form | many form", selected by count
function resolvePlural(translated: string, count: number): string {
  if (!translated.includes('|')) return translated
  const forms = translated.split('|').map((s) => s.trim())
  const index = count === 1 ? 0 : 1
  return forms[Math.min(index, forms.length - 1)] ?? translated
}

/**
 * Compatibility shim for vue-i18n's useI18n().
 * Returns { t, locale } backed by Tolgee's useTranslate() and useTolgee().
 */
export function useI18n() {
  const { t: tolgeeT } = useTranslate()
  const tolgeeInstance = useTolgee(['language'])

  const locale = computed({
    get: () => tolgeeInstance.value.getLanguage() ?? 'en',
    set: (lang: string) => {
      tolgeeInstance.value.changeLanguage(lang)
    },
  })

  const t = (
    key: string,
    paramsOrDefault?: Record<string, unknown> | string | number,
    pluralIndex?: number
  ): string => {
    let params: Record<string, unknown> | undefined
    let count: number | undefined

    if (typeof paramsOrDefault === 'number') {
      count = paramsOrDefault
    } else if (typeof paramsOrDefault === 'object' && paramsOrDefault !== null) {
      params = paramsOrDefault
    }

    if (typeof pluralIndex === 'number') {
      count = pluralIndex
    }

    const translated = tolgeeT.value(key, params as Record<string, string> | undefined)

    if (count !== undefined) {
      return resolvePlural(translated, count)
    }

    return translated
  }

  return { t, locale }
}

export function sortLanguagesWithEnFirst(codes: string[]): string[] {
  return codes.slice().sort((a, b) => {
    if (a === 'en') return -1
    if (b === 'en') return 1
    return a.localeCompare(b)
  })
}

export function getLocale(): string | null {
  const localStore = useLocalStore()
  return localStore.getLanguage
}

let languageListenerAttached = false

function createGlobalT() {
  return (
    key: string,
    paramsOrDefault?: Record<string, unknown> | string | number,
    pluralIndex?: number
  ): string => {
    let params: Record<string, unknown> | undefined
    let count: number | undefined

    if (typeof paramsOrDefault === 'number') {
      count = paramsOrDefault
    } else if (typeof paramsOrDefault === 'object' && paramsOrDefault !== null) {
      params = paramsOrDefault
    }

    if (typeof pluralIndex === 'number') {
      count = pluralIndex
    }

    const translated = tolgee.t(key, undefined, params as Record<string, string> | undefined)

    if (count !== undefined) {
      return resolvePlural(translated, count)
    }

    return translated
  }
}

export function appUseI18n(app: App) {
  app.use(VueTolgee, { tolgee })

  const globalT = createGlobalT()

  // Override VueTolgee's $t with our plural-aware version
  app.config.globalProperties.$t = globalT as typeof app.config.globalProperties.$t
  window.__APP_I18N__ = { global: { t: globalT } }

  const initialLocale = getLocale() ?? 'en'
  tolgee.changeLanguage(initialLocale)
  Settings.defaultLocale = initialLocale

  if (!languageListenerAttached) {
    bus.on('language:changed', ({ language }: { language: string }) => {
      tolgee.changeLanguage(language)
      Settings.defaultLocale = language
    })
    languageListenerAttached = true
  }
}
