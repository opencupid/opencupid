import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { ...actual, useWindowSize: () => ({ width: { value: 800 }, height: { value: 600 } }) }
})
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: () => false }))

const search = vi
  .fn()
  .mockResolvedValue({ success: true, data: { result: [{ id: '1', slug: 'vue', name: 'vue' }] } })
const create = vi
  .fn()
  .mockResolvedValue({ success: true, data: { result: { id: '2', slug: 'new', name: 'new' } } })
vi.mock('@/store/tagStore', () => ({ useTagsStore: () => ({ search, create }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))

// A stub that exposes the multiselect open/close events.
// Name must match the component's own `name: 'vue-multiselect'` for findComponent({ name }) to work.
const MultiselectStub = {
  name: 'vue-multiselect',
  template: '<div />',
  emits: ['open', 'close', 'update:modelValue', 'search-change', 'tag'],
  props: {
    modelValue: { default: () => [] },
    options: { default: () => [] },
    multiple: Boolean,
    loading: Boolean,
    searchable: Boolean,
    maxHeight: Number,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

import TagSelector from '../TagSelector.vue'

describe('TagSelector', () => {
  it('searches and adds tags', async () => {
    const wrapper = mount(TagSelector, { props: { modelValue: [] } })
    await (wrapper.vm as any).asyncFind('vue')
    expect(search).toHaveBeenCalledWith('vue')
    await (wrapper.vm as any).addTag('new')
    await wrapper.vm.$nextTick()
    expect(create).toHaveBeenCalledWith({ name: 'new' })
    expect((wrapper.vm as any).model.length).toBe(1)
  })

  it('shows initialOptions when query is empty', async () => {
    const initialOptions = [
      { id: 'a', slug: 'hiking', name: 'hiking' },
      { id: 'b', slug: 'music', name: 'music' },
    ]
    const wrapper = mount(TagSelector, { props: { modelValue: [], initialOptions } })
    await (wrapper.vm as any).asyncFind('')
    expect((wrapper.vm as any).tags).toEqual(initialOptions)
  })

  it('shows empty options when query is empty and no initialOptions provided', async () => {
    const wrapper = mount(TagSelector, { props: { modelValue: [] } })
    await (wrapper.vm as any).asyncFind('')
    expect((wrapper.vm as any).tags).toEqual([])
  })
})

describe('TagSelector dropdown:open / dropdown:close events', () => {
  it('emits dropdown:open when the inner Multiselect emits open', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
      global: { stubs: { Multiselect: MultiselectStub } },
    })
    await wrapper.findComponent({ name: 'vue-multiselect' }).vm.$emit('open')
    await flushPromises()
    expect(wrapper.emitted('dropdown:open')).toHaveLength(1)
  })

  it('emits dropdown:close when the inner Multiselect emits close', async () => {
    const wrapper = mount(TagSelector, {
      props: { modelValue: [] },
      global: { stubs: { Multiselect: MultiselectStub } },
    })
    await wrapper.findComponent({ name: 'vue-multiselect' }).vm.$emit('close')
    await flushPromises()
    expect(wrapper.emitted('dropdown:close')).toHaveLength(1)
  })
})
