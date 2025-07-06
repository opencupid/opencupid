import { defineStore } from "pinia";
import { useI18n } from "vue-i18n";
import { ref, watch } from "vue";
import { bus } from "@/lib/bus";
import { useLocalStore } from "@/store/localStore";

import { Settings } from 'luxon'
Settings.defaultZone = 'Europe/Berlin'

const labels: Record<string, string> = {
  en: 'English',
  hu: 'Magyar',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  sk: 'Slovenčina',
  pl: 'Polski',
  ro: 'Română',
  nl: 'Nederlands',
}


export const useI18nStore = defineStore('i18n', () => {

  const localStore = useLocalStore()
  localStore.initialize()
  const { locale, availableLocales } = useI18n()
  const currentLanguage = ref(localStore.getLanguage)
  if (!currentLanguage.value)
    currentLanguage.value = getBrowserLanguage(availableLocales)
  locale.value = currentLanguage.value

  // Sync changes to localStore + vue-i18n
  watch(currentLanguage, (newLang) => {
    locale.value = newLang
    // Set the locale for Luxon
    Settings.defaultLocale = locale.value
    localStore.setLanguage(newLang)
    bus.emit('language:changed', { language: newLang })
  })

  function getLanguage() {
    return currentLanguage.value
  }

  function setLanguage(lang: string) {

    if (!labels[lang]) {
      console.error(`Unsupported language: ${lang}`)
      return
    }
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

  return {
    currentLanguage,
    getAvailableLocales,
    getAvailableLocalesWithLabels,
    setLanguage,
    getLanguage,
  }
})

function getBrowserLanguage(availableLocales: string[]): string {
  // TODO - handle multiple languages in navigator.languages
  // is navigator.language always == navigator.languages[0]?
  // const browserLanguage = navigator.language || navigator.languages[0] || 'en'
  const browserLang = (navigator.language || 'en').split('-')[0]
  return availableLocales.includes(browserLang) ? browserLang : 'en'

}