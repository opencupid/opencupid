import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    getLanguage: () => 'en',
    currentLanguage: ref('en'),
  }),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

import CountrySelector from '../CountrySelector.vue'

describe('CountrySelector', () => {
  it('emits update when selection changes', async () => {
    const wrapper = mount(CountrySelector, { props: { modelValue: '' } })
    ;(wrapper.vm as any).country = { label: 'USA', value: 'US' }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['US'])
  })
})
