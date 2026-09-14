import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { bus } from '@/lib/bus'
import { useLocalStore } from '@/store/localStore'
import { appLocales, isSupportedLocale, negotiateLocale } from '@shared/i18n/locales'

export const useI18nStore = defineStore('i18n', () => {
  const localStore = useLocalStore()

  const { locale } = useI18n()

  // Ordered preferences, not `??`: a stored value can predate the supported
  // set, so it has to lose to a usable locale rather than leave
  // currentLanguage holding something setLanguage will reject.
  const preferredLanguage = getPreferredLanguage(localStore.getLanguage)
  const currentLanguage = ref(preferredLanguage)

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

function getPreferredLanguage(stored: string | null): string {
  const preferences = stored ? [stored, ...navigator.languages] : navigator.languages
  return negotiateLocale(preferences, __APP_CONFIG__.FALLBACK_LOCALE)
}
