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

const changeLanguageMock = vi.fn()
const tMock = vi.fn(
  (key: string, defaultOrOpts?: string | Record<string, string>, opts?: Record<string, string>) => {
    if (typeof defaultOrOpts === 'string') return defaultOrOpts
    const params = opts ?? (typeof defaultOrOpts === 'object' ? defaultOrOpts : undefined)
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  }
)

vi.mock('../tolgee', () => ({
  tolgee: {
    t: (...args: unknown[]) =>
      tMock(...(args as [string, (string | Record<string, string>)?, Record<string, string>?])),
    changeLanguage: (...args: unknown[]) => changeLanguageMock(...args),
    run: vi.fn(),
  },
  availableLanguages: ['en'],
}))

vi.mock('@tolgee/vue', () => ({
  VueTolgee: { install: vi.fn() },
  useTranslate: vi.fn(),
  useTolgee: vi.fn(),
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
    vi.resetModules()
    getLanguageMock.mockReturnValue(null)
    Object.keys(busHandlers).forEach((key) => delete busHandlers[key])
    delete window.__APP_I18N__
  })

  it('sorts languages with english first', async () => {
    const { sortLanguagesWithEnFirst } = await import('../i18n')
    expect(sortLanguagesWithEnFirst(['de', 'fr', 'en'])).toEqual(['en', 'de', 'fr'])
  })

  it('appUseI18n installs plugin and sets up window.__APP_I18N__', async () => {
    getLanguageMock.mockReturnValue('de')

    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    expect(app.use).toHaveBeenCalled()
    expect(window.__APP_I18N__).toBeDefined()
    expect(typeof window.__APP_I18N__!.global.t).toBe('function')
    expect(changeLanguageMock).toHaveBeenCalledWith('de')
  })

  it('sets initial locale to en when no stored locale', async () => {
    getLanguageMock.mockReturnValue(null)

    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    expect(changeLanguageMock).toHaveBeenCalledWith('en')
  })

  it('updates locale on language:changed bus event', async () => {
    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)
    changeLanguageMock.mockClear()

    busHandlers['language:changed']?.({ language: 'fr' })

    expect(changeLanguageMock).toHaveBeenCalledWith('fr')
  })

  it('global t function delegates to tolgee.t', async () => {
    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    const result = window.__APP_I18N__!.global.t('test.key')
    expect(result).toBe('test.key')
  })

  it('global t function passes params to tolgee.t', async () => {
    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    const result = window.__APP_I18N__!.global.t('test.key', { name: 'John' })
    expect(result).toBe('test.key:{"name":"John"}')
  })

  it('global t function returns default value when string is passed', async () => {
    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    const result = window.__APP_I18N__!.global.t('missing.key', 'fallback text')
    expect(result).toBe('fallback text')
  })

  it('global t function passes count param for ICU plural resolution', async () => {
    const { appUseI18n } = await import('../i18n')
    const app = { use: vi.fn(), config: { globalProperties: {} } } as unknown as App

    appUseI18n(app)

    const result = window.__APP_I18N__!.global.t('matches.received_likes', { count: 5 })
    expect(tMock).toHaveBeenCalledWith('matches.received_likes', undefined, { count: 5 })
    expect(result).toBe('matches.received_likes:{"count":5}')
  })
})
