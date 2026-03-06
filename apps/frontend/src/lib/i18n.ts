import { createI18n, type Composer } from 'vue-i18n'
import { Settings } from 'luxon'
import { useLocalStore } from '@/store/localStore'
import { bus } from './bus'

type LocaleMessages = Record<string, Record<string, unknown>>

declare global {
  interface Window {
    __APP_I18N__?: ReturnType<typeof createI18n>
  }
}

const LOCALE_FILE_REGEX = /([\w-]+)\.json$/

Settings.defaultZone = 'Europe/Berlin'

function extractLocaleFromPath(path: string): string | null {
  return path.match(LOCALE_FILE_REGEX)?.[1] ?? null
}

function loadDevMessages(): LocaleMessages {
  const modules = import.meta.glob('@shared/i18n/*.json', {
    eager: true,
    import: 'default',
  }) as Record<string, Record<string, unknown>>

  return Object.entries(modules).reduce<LocaleMessages>((acc, [path, localeMessages]) => {
    const locale = extractLocaleFromPath(path)
    if (!locale) {
      return acc
    }

    acc[locale] = localeMessages
    return acc
  }, {})
}

export const messages: LocaleMessages = loadDevMessages()

let cachedI18n: ReturnType<typeof createI18n> | null = null
let languageListenerAttached = false

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

function getI18nInstance() {
  if (!cachedI18n) {
    cachedI18n = window.__APP_I18N__ ?? appCreateI18n()
    window.__APP_I18N__ = cachedI18n
  }

  return cachedI18n
}

function setLocale(i18n: ReturnType<typeof createI18n>, locale: string) {
  ;(i18n.global as Composer).locale.value = locale
  Settings.defaultLocale = locale
}

export function appUseI18n(app: { use: (plugin: unknown) => void }) {
  const i18n = getI18nInstance()
  app.use(i18n)

  setLocale(i18n, getLocale() ?? 'en')

  if (!languageListenerAttached) {
    bus.on('language:changed', ({ language }) => {
      setLocale(i18n, language)
    })
    languageListenerAttached = true
  }
}

if (import.meta.hot) {
  import.meta.hot.accept((nextModule) => {
    const nextMessages = nextModule?.messages as LocaleMessages | undefined
    const i18n = window.__APP_I18N__ ?? cachedI18n

    if (!i18n || !nextMessages) {
      return
    }

    Object.entries(nextMessages).forEach(([locale, localeMessages]) => {
      i18n.global.setLocaleMessage(locale, localeMessages)
    })
  })
}
