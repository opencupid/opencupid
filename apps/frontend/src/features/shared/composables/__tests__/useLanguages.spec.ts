import { describe, it, expect, afterEach } from 'vitest'
import { computed } from 'vue'
import { tolgee } from '@/lib/tolgee'
import { useLanguages } from '../useLanguages'

describe('useLanguages', () => {
  afterEach(async () => {
    await tolgee.changeLanguage('en')
  })

  it('labels languages in the active locale', async () => {
    await tolgee.changeLanguage('hu')

    expect(useLanguages().getLanguageLabels(['en', 'hu', 'it'])).toEqual([
      { value: 'en', label: 'angol' },
      { value: 'hu', label: 'magyar' },
      { value: 'it', label: 'olasz' },
    ])
  })

  // The labels used to come from a copy of the locale seeded once at boot,
  // which a later language change left behind.
  it('follows a language change without re-initialization', async () => {
    const labels = computed(() => useLanguages().getLanguageLabels(['it'])[0]!.label)

    expect(labels.value).toBe('Italian')

    await tolgee.changeLanguage('hu')

    expect(labels.value).toBe('olasz')
  })

  it('offers selector options in the active locale', async () => {
    await tolgee.changeLanguage('hu')
    const options = useLanguages().getLanguageSelectorOptions()

    expect(options.find((o) => o.value === 'it')?.label).toBe('olasz')
  })
})
