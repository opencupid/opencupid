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
})
