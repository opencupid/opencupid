import { describe, it, expect, afterEach } from 'vitest'
import { computed } from 'vue'
import { tolgee } from '@/lib/tolgee'
import { useCountries } from '../useCountries'

describe('useCountries', () => {
  afterEach(async () => {
    await tolgee.changeLanguage('en')
  })

  it('names countries in the active locale', async () => {
    await tolgee.changeLanguage('hu')

    expect(useCountries().countryCodeToName('DE')).toBe('Németország')
  })

  // The locale was held in a plain `let`, so even a re-render read the
  // value it was seeded with at boot.
  it('follows a language change without re-initialization', async () => {
    const name = computed(() => useCountries().countryCodeToName('DE'))

    expect(name.value).toBe('Germany')

    await tolgee.changeLanguage('hu')

    expect(name.value).toBe('Németország')
  })

  it('offers country options in the active locale', async () => {
    await tolgee.changeLanguage('hu')

    expect(useCountries().getCountryOptions()).toContainEqual({ value: 'DE', label: 'Németország' })
  })
})
