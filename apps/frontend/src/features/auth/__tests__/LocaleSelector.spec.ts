import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    currentLanguage: 'en',
    getAvailableLocalesWithLabels: () => [
      { value: 'en', label: 'English' },
      { value: 'de', label: 'Deutsch' }
    ]
  })
}))

import LocaleSelector from '../components/LocaleSelector.vue'

describe('LocaleSelector', () => {
  it('emits selected locale when clicked', async () => {
    const wrapper = mount(LocaleSelector)
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    await link.trigger('click')
    expect(wrapper.emitted('language:select')).toEqual([[ 'de' ]])
  })
})
