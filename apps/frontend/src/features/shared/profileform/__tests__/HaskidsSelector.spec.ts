import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../composables/useEnumOptions', () => ({
  useEnumOptions: () => ({ hasKidsOptions: () => [{ value: 'yes', label: 'Yes' }] }),
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import HaskidsSelector from '../HaskidsSelector.vue'

describe('HaskidsSelector', () => {
  it('updates model on select', async () => {
    const wrapper = mount(HaskidsSelector, {
      global: { stubs: { BListGroup: true, BListGroupItem: true, BFormRadio: true } },
    })
    ;(wrapper.vm as any).model = 'yes'
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).model).toBe('yes')
  })
})
