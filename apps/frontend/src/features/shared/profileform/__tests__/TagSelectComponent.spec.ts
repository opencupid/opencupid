import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))

const search = vi.fn().mockResolvedValue([{ id: '1', name: 'vue' }])
const create = vi.fn().mockResolvedValue({ id: '2', name: 'new' })
vi.mock('@/store/tagStore', () => ({ useTagsStore: () => ({ search, create }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

import TagSelectComponent from '../TagSelectComponent.vue'

describe('TagSelectComponent', () => {
  it('searches and adds tags', async () => {
    const wrapper = mount(TagSelectComponent, { props: { modelValue: [] } })
    await (wrapper.vm as any).asyncFind('vue')
    expect(search).toHaveBeenCalledWith('vue')
    await (wrapper.vm as any).addTag('new')
    await wrapper.vm.$nextTick()
    expect(create).toHaveBeenCalledWith({ name: 'new' })
    expect((wrapper.vm as any).model.length).toBe(1)
  })
})
