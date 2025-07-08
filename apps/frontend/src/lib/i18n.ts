import { createI18n, type Composer } from 'vue-i18n'

declare global {
  interface Window {
    __APP_I18N__?: ReturnType<typeof createI18n>
  }
}

const defaultLocale = 'en'

export const labels: Record<string, string> = {
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


function getAvailableLocales() {
  return Object.keys(labels)
}


import { Settings } from 'luxon'
Settings.defaultZone = 'Europe/Berlin'

// https://lokalise.com/blog/vue-i18n/

// Import JSON locale files
import en from '@shared/i18n/en.json'

export const messagesLoaders: Record<string, () => Promise<any>> = {
  hu: () => import('@shared/i18n/hu.json'),
  de: () => import('@shared/i18n/de.json'),
  fr: () => import('@shared/i18n/fr.json'),
  es: () => import('@shared/i18n/es.json'),
  it: () => import('@shared/i18n/it.json'),
  pt: () => import('@shared/i18n/pt.json'),
  sk: () => import('@shared/i18n/sk.json'),
  pl: () => import('@shared/i18n/pl.json'),
  ro: () => import('@shared/i18n/ro.json'),
  nl: () => import('@shared/i18n/nl.json'),
}


// import { useLocalStore } from '@/store/localStore'
import { bus } from './bus'
import { useLocalStore } from '../store/localStore'


export function sortLanguagesWithEnFirst(codes: string[]): string[] {
  return codes.slice().sort((a, b) => {
    if (a === defaultLocale) return -1
    if (b === defaultLocale) return 1
    return a.localeCompare(b)
  })
}

function getBrowserLanguage(availableLocales: string[]): string {
  // TODO - handle multiple languages in navigator.languages
  // is navigator.language always == navigator.languages[0]?
  // const browserLanguage = navigator.language || navigator.languages[0] || 'en'
  const browserLang = (navigator.language || 'en').split('-')[0]
  return availableLocales.includes(browserLang) ? browserLang : 'en'

}

export function appCreateI18n(preferredLanguage: string, additionalMessages: any) {

  const showWarnings = __APP_CONFIG__.NODE_ENV === 'development'

  const messages: Record<string, any> = {
    en,
    ...(additionalMessages ? { [preferredLanguage]: additionalMessages.default || additionalMessages } : {})
  }

  return createI18n({
    legacy: false,
    locale: preferredLanguage,
    fallbackLocale: defaultLocale,
    messages,
    missingWarn: showWarnings,
    fallbackWarn: showWarnings,
  })
}

async function ensureMessagesLoaded(language: string) {
  const i18n = window.__APP_I18N__
  // check if the messages are already loaded
  if (i18n?.global?.messages && i18n.global.messages[language as keyof typeof i18n.global.messages]) {
    return
  }

  // don't load default messages
  if (language === 'en') return

  return await messagesLoaders[language]?.()
}

function getPreferredLanguage() {
  const localStore = useLocalStore()
  return localStore.getLanguage ??
    getBrowserLanguage(getAvailableLocales()) ?? defaultLocale

}

async function changeLocale(language: string) {
  const i18n = window.__APP_I18N__

  const messages = await ensureMessagesLoaded(language)

  if (messages) {
    (i18n?.global as Composer).setLocaleMessage(language, messages.default || messages)
  } else {
    console.warn(`No message loader found for locale: ${language}`)
  }

  // Apply new locale
  (i18n?.global as Composer).locale.value = language
  console.log('locale changed to:', language)
  Settings.defaultLocale = language
}

export async function appUseI18n(app: any) {
  const preferredLanguage = getPreferredLanguage()

  let additionalMessages

  if (preferredLanguage !== defaultLocale) {
    additionalMessages = await ensureMessagesLoaded(preferredLanguage)
  }
  const i18n = window.__APP_I18N__ || appCreateI18n(preferredLanguage, additionalMessages || {})
  window.__APP_I18N__ = i18n as any
  app.use(i18n)

  bus.on('language:changed', async ({ language }) => {
    await changeLocale(language)
  })
}
