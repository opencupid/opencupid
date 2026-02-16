import { defineStore } from "pinia";
import { useI18n } from "vue-i18n";
import { ref, watch } from "vue";
import { bus } from "@/lib/bus";
import { useLocalStore } from "@/store/localStore";

const labels: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
  // de: 'Deutsch',
  // fr: 'Français',
  // es: 'Español',
  // it: 'Italiano',
  // pt: 'Português',
  // sk: 'Slovenčina',
  // pl: 'Polski',
  // ro: 'Română',
  // nl: 'Nederlands',
}


export const useI18nStore = defineStore('i18n', () => {

  const localStore = useLocalStore()

  const { locale } = useI18n()

  const preferredLanguage = (localStore.getLanguage ?? getBrowserLanguage(Object.keys(labels))) ?? 'en'
  const currentLanguage = ref(preferredLanguage)

  // Sync changes vue-i18n
  watch(currentLanguage, (newLang) => {
    setLanguage(newLang)
  }, { immediate: true })

  // sync changes from vue-i18n to localStore
  watch(locale, (newLocale) => {
    localStore.setLanguage(newLocale)
  })

  function getLanguage() {
    return locale.value
  }

  function setLanguage(lang: string) {

    if (!labels[lang]) {
      console.error(`Unsupported language: ${lang}`)
      return
    }
    bus.emit('language:changed', { language: lang })
    currentLanguage.value = lang
  }

  function getAvailableLocales() {
    return Object.keys(labels)
  }

  function getAvailableLocalesWithLabels() {
    return Object.keys(labels).map((lang) => ({
      value: lang,
      label: labels[lang] || lang, // Fallback to code if no label found
    }))
  }

  function getLanguageLabels(languages: string[]) {
    return languages.map((lang) => ({
      value: lang,
      label: labels[lang] || lang, // Fallback to code if no label found
    }))
  }

  return {
    currentLanguage,
    getAvailableLocales,
    getLanguageLabels,
    getAvailableLocalesWithLabels,
    setLanguage,
    getLanguage,
  }
})

function getBrowserLanguage(availableLocales: string[]): string {
  // TODO - handle multiple languages in navigator.languages
  // is navigator.language always == navigator.languages[0]?
  // const browserLanguage = navigator.language || navigator.languages[0] || 'en'
  const browserLang = (navigator.language || 'en').split('-')[0] ?? 'en'
  return availableLocales.includes(browserLang) ? browserLang : 'en'

}