import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/languages', () => ({
  getLanguageSelectorOptions: () => [{ label: 'English', value: 'en' }],
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

import LanguageSelector from '../LanguageSelector.vue'

describe('LanguageSelector', () => {
  it('emits update on selection', async () => {
    const wrapper = mount(LanguageSelector, { props: { modelValue: [] } })
    ;(wrapper.vm as any).languagesComputed = [{ label: 'English', value: 'en' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')![0]![0]).toEqual(['en'])
  })
})
