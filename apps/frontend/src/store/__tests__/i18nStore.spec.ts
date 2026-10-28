import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'

// The store calls useI18n() at setup, which needs a Tolgee provider that only
// exists inside a mounted component.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: ref('en'),
  }),
}))

import { useI18nStore } from '../i18nStore'
import { useLocalStore } from '../localStore'
import { useUserStore } from '../userStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { bus } from '@/lib/bus'

describe('useI18nStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setLanguage', () => {
    it('applies a supported locale', () => {
      const store = useI18nStore()
      const emit = vi.spyOn(bus, 'emit')

      store.setLanguage('hu')

      expect(store.currentLanguage).toBe('hu')
      expect(emit).toHaveBeenCalledWith('language:changed', { language: 'hu' })
    })

    it.each(['zz', 'de', ''])('rejects the unsupported locale %o', (lang) => {
      const store = useI18nStore()
      const before = store.currentLanguage
      const emit = vi.spyOn(bus, 'emit')
      vi.spyOn(console, 'error').mockImplementation(() => {})

      store.setLanguage(lang)

      expect(store.currentLanguage).toBe(before)
      expect(emit).not.toHaveBeenCalled()
    })

    // appLocales is a plain object, so the previous `lang in appLocales` guard
    // reported prototype members as supported languages.
    it.each(['constructor', 'toString', '__proto__'])('rejects the prototype member %o', (lang) => {
      const store = useI18nStore()
      const before = store.currentLanguage
      const emit = vi.spyOn(bus, 'emit')
      vi.spyOn(console, 'error').mockImplementation(() => {})

      store.setLanguage(lang)

      expect(store.currentLanguage).toBe(before)
      expect(emit).not.toHaveBeenCalled()
    })

    // A region tag has no catalog of its own; only its base tag does.
    it('rejects a region-tagged locale', () => {
      const store = useI18nStore()
      const before = store.currentLanguage
      vi.spyOn(console, 'error').mockImplementation(() => {})

      store.setLanguage('hu-HU')

      expect(store.currentLanguage).toBe(before)
    })
  })

  // The store computes its initial locale at setup time from __APP_CONFIG__,
  // so each case needs a fresh Pinia to re-run that.
  describe('initial language', () => {
    const setBrowserLanguages = (...values: string[]) => {
      Object.defineProperty(navigator, 'languages', { value: values, configurable: true })
    }
    const setConfiguredFallback = (value: string) => {
      ;(globalThis as any).__APP_CONFIG__ = {
        ...(globalThis as any).__APP_CONFIG__,
        FALLBACK_LOCALE: value,
      }
    }

    afterEach(() => setConfiguredFallback('en'))

    // An English-configured browser on a Hungarian site used to get English.
    it("uses the site's locale over a supported browser language", () => {
      setBrowserLanguages('en-US', 'en', 'hu')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    it("uses the site's locale when the browser language is unsupported", () => {
      setBrowserLanguages('de-DE')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    // envsubst writes an unset var as '' and nothing validates it in the
    // browser, so an unusable fallback must not become the active locale.
    it.each(['', 'de', '${FALLBACK_LOCALE}'])(
      'degrades the unusable fallback %o to a translated locale',
      (fallback) => {
        setBrowserLanguages('hu-HU')
        setConfiguredFallback(fallback)
        setActivePinia(createPinia())

        expect(useI18nStore().currentLanguage).toBe('en')
      }
    )
  })

  // localStorage is user-editable and can hold a value written before the
  // supported set changed, so it is normalized rather than trusted.
  describe('persisted language', () => {
    const setStoredLanguage = async (value: string) => {
      localStorage.setItem('language', value)
      setActivePinia(createPinia())
      await useLocalStore().initialize()
    }

    it("prefers a supported stored language over the site's locale", async () => {
      await setStoredLanguage('hu')

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    it('narrows a region-tagged stored language to its supported base', async () => {
      await setStoredLanguage('hu-HU')

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    it.each(['de', 'constructor', ''])(
      "falls back to the site's locale from the unsupported stored value %o",
      async (stored) => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        await setStoredLanguage(stored)

        expect(useI18nStore().currentLanguage).toBe('en')
      }
    )
  })

  describe("account's language", () => {
    const user = (language: string) => ({ language }) as any

    it('applies the language of the loaded user over the stored one', async () => {
      localStorage.setItem('language', 'en')
      await useLocalStore().initialize()
      const store = useI18nStore()

      useUserStore().user = user('hu')
      await nextTick()

      expect(store.currentLanguage).toBe('hu')
    })

    // Bootstrap can load the user before App.vue mounts and creates the store.
    // Emitting the device's language first would PATCH it over the account's.
    it('applies a user loaded before the store was created without saving the device language', async () => {
      localStorage.setItem('language', 'en')
      await useLocalStore().initialize()
      useAuthStore().userId = 'cmuser00000000000000000000'
      const userStore = useUserStore()
      userStore.user = user('hu')
      const updateLanguage = vi.spyOn(userStore, 'updateLanguage')

      const store = useI18nStore()
      await nextTick()

      expect(store.currentLanguage).toBe('hu')
      expect(updateLanguage).not.toHaveBeenCalled()
    })

    it('keeps the current language when the user is cleared on logout', async () => {
      const store = useI18nStore()
      useUserStore().user = user('hu')
      await nextTick()

      useUserStore().user = null
      await nextTick()

      expect(store.currentLanguage).toBe('hu')
    })
  })
})
