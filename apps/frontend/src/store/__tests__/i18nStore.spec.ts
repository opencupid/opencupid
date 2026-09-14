import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// The store calls useI18n() at setup, which needs a Tolgee provider that only
// exists inside a mounted component.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: ref('en'),
  }),
}))

import { useI18nStore } from '../i18nStore'
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

  // The store computes its initial locale at setup time from
  // navigator.languages and __APP_CONFIG__, so each case needs a fresh Pinia
  // to re-run that.
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

    it('uses the configured fallback when the browser language is unsupported', () => {
      setBrowserLanguages('de-DE')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    it('prefers a supported browser language over the fallback', () => {
      setBrowserLanguages('en-GB')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('en')
    })

    // envsubst writes an unset var as '' and nothing validates it in the
    // browser, so an unusable fallback must not become the active locale.
    it.each(['', 'de', '${FALLBACK_LOCALE}'])(
      'degrades the unusable fallback %o to a translated locale',
      (fallback) => {
        setBrowserLanguages('de-DE')
        setConfiguredFallback(fallback)
        setActivePinia(createPinia())

        expect(useI18nStore().currentLanguage).toBe('en')
      }
    )

    // #995: only the first entry was consulted before, so this visitor got
    // the fallback instead of the English they also asked for.
    it('walks past unsupported preferences to a supported one', () => {
      setBrowserLanguages('de-AT', 'de', 'en')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('en')
    })

    it('takes the most preferred supported language', () => {
      setBrowserLanguages('hu-HU', 'en')
      setConfiguredFallback('en')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('hu')
    })

    it('falls back when no preference is supported', () => {
      setBrowserLanguages('de-AT', 'fr')
      setConfiguredFallback('hu')
      setActivePinia(createPinia())

      expect(useI18nStore().currentLanguage).toBe('hu')
    })
  })
})
