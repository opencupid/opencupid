import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: ref('en') }) }))
vi.mock('@/features/komoot/stores/komootStore', () => ({
  useKomootStore: () => ({ search: vi.fn(), results: [], isLoading: false }),
}))

import LocationSelectorComponent from '../LocationSelector.vue'
import { ref } from 'vue'

describe('LocationSelectorComponent', () => {
  it('emits updates when fields change', async () => {
    const wrapper = mount(LocationSelectorComponent, {
      props: { modelValue: { country: '', cityName: '' } as any },
      global: { stubs: { FormKit: true } },
    })
    ;(wrapper.vm as any).model = {
      ...(wrapper.vm as any).model,
      country: 'US',
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    ;(wrapper.vm as any).model = {
      ...(wrapper.vm as any).model,
      cityName: 'NYC',
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')!.length).toBeGreaterThanOrEqual(1)
  })
})
