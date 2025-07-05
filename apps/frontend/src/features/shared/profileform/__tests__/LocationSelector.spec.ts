import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))
vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({
    getLanguage: () => 'en',
    currentLanguage: ref('en'),
  }),
}))
vi.mock('@/composables/useCountries', () => ({
  useCountries: () => ({
    getCountryOptions: () => [{ label: 'USA', value: 'US' }],
    countryCodeToName: () => 'USA',
  }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/geoip', () => ({ default: vi.fn().mockResolvedValue('US') }))
vi.mock('@/store/cityStore', () => ({ useCitiesStore: () => ({
  getCity: vi.fn(),
  search: vi.fn(),
  create: vi.fn(),
}) }))

import LocationSelectorComponent from '../LocationSelector.vue'
import { ref } from 'vue'

describe('LocationSelectorComponent', () => {
  it('emits updates when fields change', async () => {
    const wrapper = mount(LocationSelectorComponent, {
      props: { modelValue: { country: '', cityName: '' } as any },
      global: { stubs: { FormKit: true } }
    })
    ;(wrapper.vm as any).model = {
      ...((wrapper.vm as any).model),
      country: 'US'
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    ;(wrapper.vm as any).model = {
      ...((wrapper.vm as any).model),
      cityName: 'NYC'
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')!.length).toBeGreaterThanOrEqual(1)
  })
})
