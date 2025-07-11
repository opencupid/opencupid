import { createI18n, type Composer } from 'vue-i18n'

declare global {
  interface Window {
    __APP_I18N__?: ReturnType<typeof createI18n>
  }
}



import { Settings } from 'luxon'
Settings.defaultZone = 'Europe/Berlin'


import messages from './i18n-messages'

import { useLocalStore } from '@/store/localStore'
import { bus } from './bus'

export function getLocale(): string | null {
  const localStore = useLocalStore()
  return localStore.getLanguage
}

export function sortLanguagesWithEnFirst(codes: string[]): string[] {
  return codes.slice().sort((a, b) => {
    if (a === 'en') return -1
    if (b === 'en') return 1
    return a.localeCompare(b)
  })
}


export function appCreateI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages,
    missingWarn: true,
    fallbackWarn: false,
  })
}


export function appUseI18n(app: any) {
  const i18n = window.__APP_I18N__ || appCreateI18n()
  window.__APP_I18N__ = i18n as any
  app.use(i18n)

  const defaultLocale = getLocale() || 'en'
  if (defaultLocale) {
    (i18n.global as Composer).locale.value = defaultLocale
    Settings.defaultLocale = defaultLocale
  }

  bus.on('language:changed', ({ language }) => {
    (i18n.global as Composer).locale.value = language
    Settings.defaultLocale = language
  })
}
