import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../composables/useEnumOptions', () => ({ useEnumOptions: () => ({ relationshipStatusOptions: () => [{ value: 'single', label: 'Single' }] }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))

import RelationstatusSelector from '../RelationstatusSelector.vue'

describe('RelationstatusSelector', () => {
  it('updates model on select', async () => {
    const wrapper = mount(RelationstatusSelector, { global: { stubs: { BListGroup: true, BListGroupItem: true, BFormRadio: true } } })
    ;(wrapper.vm as any).model = 'single'
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).model).toBe('single')
  })
})
