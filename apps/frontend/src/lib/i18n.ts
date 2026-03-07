import type { App } from 'vue'
import { computed } from 'vue'
import { VueTolgee, useTranslate, useTolgee } from '@tolgee/vue'
import { Settings } from 'luxon'
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

  const t = (key: string, params?: Record<string, unknown>): string => {
    return tolgeeT.value(key, params as Record<string, string> | undefined)
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
  const { useLocalStore } = require('@/store/localStore')
  const localStore = useLocalStore()
  return localStore.getLanguage
}

let languageListenerAttached = false

export function appUseI18n(app: App) {
  app.use(VueTolgee, { tolgee })

  const globalT = (key: string, params?: Record<string, unknown>): string => {
    return tolgee.t(key, undefined, params as Record<string, string> | undefined)
  }

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
