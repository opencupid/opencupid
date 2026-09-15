import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { bus } from '@/lib/bus'
import { useLocalStore } from '@/store/localStore'
import { appLocales, normalizeLocale } from '@shared/i18n/locales'

export const useI18nStore = defineStore('i18n', () => {
  const localStore = useLocalStore()

  const { locale } = useI18n()

  const preferredLanguage = localStore.getLanguage ?? getBrowserLanguage()
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
    if (normalizeLocale(lang) !== lang) {
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

function getBrowserLanguage(): string {
  return normalizeLocale(navigator.language, __APP_CONFIG__.FALLBACK_LOCALE)
}
