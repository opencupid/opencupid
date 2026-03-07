import { describe, expect, it } from 'vitest'
import { getBrowserLanguage } from '../i18nStore'

describe('getBrowserLanguage', () => {
  it('falls back to English when navigator is not available', () => {
    expect(getBrowserLanguage(['en', 'hu'], undefined)).toBe('en')
  })

  it('returns the browser language when it is supported', () => {
    expect(getBrowserLanguage(['en', 'hu'], { language: 'hu-HU' })).toBe('hu')
  })

  it('falls back to English when browser language is unsupported', () => {
    expect(getBrowserLanguage(['en', 'hu'], { language: 'de-DE' })).toBe('en')
  })
})
