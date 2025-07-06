import { createI18n } from 'vue-i18n'

declare global {
  interface Window {
    __APP_I18N__?: ReturnType<typeof createI18n>
  }
}

// https://lokalise.com/blog/vue-i18n/

// Import JSON locale files
import en from '@shared/i18n/en.json'
import hu from '@shared/i18n/hu.json'
import de from '@shared/i18n/de.json'
import fr from '@shared/i18n/fr.json'
import { useLocalStore } from '@/store/localStore'

export function getLocale(): string {
  const localStore = useLocalStore()
  // Ensure the store is initialized so values are loaded from localStorage
  if (!localStore.language) localStore.initialize()
  return localStore.getLanguage
}

export function appCreateI18n() {
  return createI18n({
    legacy: false,
    locale: getLocale(),
    fallbackLocale: 'en',
    messages: { en, hu, de, fr },
    missingWarn: true,
    fallbackWarn: false,
  })
}

export function appUseI18n(app: any) {
  const i18n = window.__APP_I18N__ || appCreateI18n()
  window.__APP_I18N__ = i18n as any
  app.use(i18n)
  // app.provide('$i18n', i18n)
}
