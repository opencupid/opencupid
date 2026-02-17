import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    getLanguage: () => 'en',
    currentLanguage: ref('en'),
  }),
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

import CountrySelector from '../CountrySelector.vue'

describe('CountrySelector', () => {
  it('emits update:modelValue when country selection changes', async () => {
    const wrapper = mount(CountrySelector, {
      props: {
        modelValue: { country: '', cityId: '', cityName: '' },
      },
    })

    // simulate selecting a country via Multiselect
    const vm = wrapper.vm as any

    // directly set the computed country
    vm.country = { label: 'United States', value: 'US' }

    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')

    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([{ country: 'US', cityId: '', cityName: '' }])
  })
})
