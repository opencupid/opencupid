import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { bus } from '@/lib/bus'
import { useLocalStore } from '@/store/localStore'
import { useUserStore } from '@/store/userStore'
import { appLocales, isSupportedLocale, normalizeLocale } from '@shared/i18n/locales'

export const useI18nStore = defineStore('i18n', () => {
  const localStore = useLocalStore()

  const { locale } = useI18n()

  const currentLanguage = ref(getInitialLanguage(localStore.getLanguage))

  // Sync changes vue-i18n
  watch(
    currentLanguage,
    (newLang) => {
      setLanguage(newLang)
    },
    { immediate: true }
  )

  // sync changes from vue-i18n to localStore
  watch(locale, (newLocale) => {
    localStore.setLanguage(newLocale)
  })

  // The account's language outranks this device's: it is what the user chose
  // and what the server writes their emails in.
  const userStore = useUserStore()
  watch(
    () => userStore.user?.language,
    (lang) => {
      if (lang) setLanguage(lang)
    },
    { immediate: true }
  )

  function getLanguage() {
    return locale.value
  }

  function setLanguage(lang: string) {
    if (!isSupportedLocale(lang)) {
      console.error(`Unsupported language: ${lang}`)
      return
    }
    bus.emit('language:changed', { language: lang })
    currentLanguage.value = lang
  }

  function getAvailableLocales() {
    return Object.keys(appLocales)
  }

  function getAvailableLocalesWithLabels() {
    return Object.keys(appLocales).map((lang) => ({
      value: lang,
      label: appLocales[lang] || lang,
    }))
  }

  return {
    currentLanguage,
    getAvailableLocales,
    getAvailableLocalesWithLabels,
    setLanguage,
    getLanguage,
  }
})

// The site's locale rather than the browser's: a Hungarian site visited from
// an English-configured browser should still open in Hungarian. A stored value
// can predate the supported set, so it is normalized rather than trusted.
function getInitialLanguage(stored: string | null): string {
  return normalizeLocale(stored ?? '', __APP_CONFIG__.FALLBACK_LOCALE)
}
