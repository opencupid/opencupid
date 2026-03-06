import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { App } from 'vue'

const busHandlers: Record<string, (payload: unknown) => void> = {}

vi.mock('../bus', () => ({
  bus: {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      busHandlers[event] = handler
    }),
  },
}))

const getLanguageMock = vi.fn<() => string | null>(() => null)

vi.mock('@/store/localStore', () => ({
  useLocalStore: () => ({
    get getLanguage() {
      return getLanguageMock()
    },
  }),
}))

describe('i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLanguageMock.mockReturnValue(null)
    Object.keys(busHandlers).forEach((key) => delete busHandlers[key])
    delete window.__APP_I18N__
  })

  it('sorts languages with english first', async () => {
    const { sortLanguagesWithEnFirst } = await import('../i18n')

    expect(sortLanguagesWithEnFirst(['de', 'fr', 'en'])).toEqual(['en', 'de', 'fr'])
  })

  it('uses stored locale and updates locale on language change event', async () => {
    getLanguageMock.mockReturnValue('de')

    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn() } as unknown as App

    appUseI18n(app)

    expect(window.__APP_I18N__).toBeDefined()
    expect(window.__APP_I18N__?.global.locale.value).toBe('de')

    busHandlers['language:changed']?.({ language: 'fr' })

    expect(window.__APP_I18N__?.global.locale.value).toBe('fr')
  })
})
