import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocalStore } from '../localStore'

describe('useLocalStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('initialize', () => {
    it('reads a previously saved language synchronously, before any await', async () => {
      localStorage.setItem('language', 'hu')

      const store = useLocalStore()
      const result = store.initialize()

      // No caller in the app awaits initialize() before reading getLanguage(),
      // so the value must already be set once initialize() has been called,
      // not only after its returned promise resolves.
      expect(store.getLanguage).toBe('hu')

      await result
      expect(store.getLanguage).toBe('hu')
    })

    it('leaves language null when nothing was saved', async () => {
      const store = useLocalStore()
      await store.initialize()

      expect(store.getLanguage).toBeNull()
    })

    it('restores theme, currentScope and sendMode from localStorage', async () => {
      localStorage.setItem('theme', 'dark')
      localStorage.setItem('currentScope', 'dating')
      localStorage.setItem('sendMode', 'enter')

      const store = useLocalStore()
      await store.initialize()

      expect(store.getTheme).toBe('dark')
      expect(store.getCurrentScope).toBe('dating')
      expect(store.getSendMode).toBe('enter')
    })
  })
})
