import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach, vi } from 'vitest'

import { tolgee } from '@/lib/tolgee'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/features/shared/ui/multiselect', () => ({ default: { template: '<div />' } }))

import LanguageSelector from '../LanguageSelector.vue'

describe('LanguageSelector', () => {
  afterEach(async () => {
    await tolgee.changeLanguage('en')
  })

  it('emits update on selection', async () => {
    const wrapper = mount(LanguageSelector, { props: { modelValue: [] } })
    ;(wrapper.vm as any).languagesComputed = [{ label: 'English', value: 'en' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')![0]![0]).toEqual(['en'])
  })

  // The options used to be snapshotted into a reactive array on mount, so a
  // language change left an open selector listing the old locale's labels.
  it('relabels its options when the locale changes while mounted', async () => {
    const wrapper = mount(LanguageSelector, { props: { modelValue: ['it'] } })
    const labelFor = (code: string) =>
      (wrapper.vm as any).languageOptions.find((o: { value: string }) => o.value === code)?.label

    expect(labelFor('it')).toBe('Italian')

    await tolgee.changeLanguage('hu')
    await wrapper.vm.$nextTick()

    expect(labelFor('it')).toBe('olasz')
  })
})
