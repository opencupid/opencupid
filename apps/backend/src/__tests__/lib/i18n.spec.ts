import { describe, expect, it, vi } from 'vitest'

// Drives the real lib/i18n.ts initialization so a regression to a hardcoded
// fallbackLng fails here rather than passing on normalizeLocale's unit tests.
vi.mock('@/lib/appconfig', () => ({
  appConfig: { FALLBACK_LOCALE: 'hu-HU' },
}))

describe('i18next initialization', () => {
  it('renders an unsupported language through the configured fallback', async () => {
    const i18next = (await import('i18next')).default
    await import('@/lib/i18n')
    await i18next.loadLanguages(['en', 'hu'])

    // 'zz' has no catalog, so this resolves through fallbackLng — which the
    // config sets to hu-HU, narrowed to the hu catalog.
    const key = 'auth.auth_id_input_label'
    const translated = i18next.getFixedT('zz')(key)
    const hungarian = i18next.getFixedT('hu')(key)
    const english = i18next.getFixedT('en')(key)

    expect(hungarian).not.toBe(english)
    expect(translated).toBe(hungarian)
  })
})
