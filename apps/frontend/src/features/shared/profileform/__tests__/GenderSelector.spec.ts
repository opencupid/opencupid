import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('./composables/useEnumOptions', () => ({
  useEnumOptions: () => ({
    genderOptions: () => [{ value: 'male', label: 'Male' }],
    pronounsOptions: () => [{ value: 'he', label: 'He' }],
  }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/features/shared/ui/GenderSelectorTitle.vue')

import GenderPickerComponent from '../GenderPronounSelector.vue'

describe('GenderPickerComponent', () => {
  it('emits update when gender changes', async () => {
    const wrapper = mount(GenderPickerComponent, {
      props: { modelValue: { gender: null, pronouns: null } as any },
      global: {
        stubs: {
          FormKit: true,
          BButton: true,
          BCollapse: true,
          BListGroup: true,
          BListGroupItem: true,
          BFormRadio: true,
        },
      },
    })
    ;(wrapper.vm as any).gender = 'male'
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')![0]![0]).toEqual({ gender: 'male', pronouns: null })
  })
})
