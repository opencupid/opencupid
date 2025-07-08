import { defineStore } from "pinia";
import { useI18n } from "vue-i18n";
import { ref, watch, type Ref } from "vue";
import { bus } from "@/lib/bus";
import { useLocalStore } from "@/store/localStore";
import { labels } from "../lib/i18n";



export const useI18nStore = defineStore('i18n', () => {

  function initialize(localeRef: Ref<string>) {
    // Sync changes to localStore + vue-i18n
    console.log('Initializing i18nStore with locale:', localeRef  )
    watch(localeRef, (newLang) => {
      localStore.setLanguage(newLang)
      console.log('Language changed to:', newLang)
    })
  }

  const localStore = useLocalStore()

  const currentLanguage = ref(localStore.getLanguage || 'en')
  
  function getCurrentLocale() {
    return localStore.getLanguage
  }

  function setLanguage(lang: string) {

    if (!labels[lang]) {
      console.error(`Unsupported language: ${lang}`)
      return
    }
    bus.emit('language:changed', { language: lang })
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

  watch(currentLanguage, (newLang) => {
    if (newLang !== localStore.getLanguage) {
      setLanguage(newLang)
    }
  })


  return {
    initialize,
    currentLanguage,
    getCurrentLocale,
    getAvailableLocales,
    getAvailableLocalesWithLabels,
    setLanguage,
    getLanguage: getCurrentLocale,
  }
})
