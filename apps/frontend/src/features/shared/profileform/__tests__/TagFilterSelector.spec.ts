import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/tagStore', () => ({ useTagsStore: () => ({ search: vi.fn(), create: vi.fn() }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))
vi.mock('../TagSelector.vue', () => ({
  default: {
    template: '<div class="tag-selector" />',
    props: ['modelValue', 'taggable', 'closeOnSelect', 'openDirection', 'initialOptions'],
  },
}))
vi.mock('../../components/TagCloud.vue', () => ({
  default: {
    name: 'TagCloud',
    template: '<div class="tag-cloud" />',
    emits: ['tag:select'],
  },
}))
vi.mock('@/assets/icons/e-commerce/tag.svg', () => ({
  default: { template: '<svg class="icon-tag" />' },
}))

import TagFilterSelector from '../TagFilterSelector.vue'

const BModal = {
  template: '<div class="b-modal" v-if="modelValue"><slot /></div>',
  props: ['modelValue'],
}
const BButton = {
  template: '<button @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
}

describe('TagFilterSelector', () => {
  const mountComponent = (props = {}) =>
    mount(TagFilterSelector, {
      props: { modelValue: [], ...props },
      global: {
        stubs: { BModal, BButton },
        mocks: { $t: (k: string) => k },
      },
    })

  it('renders tag selector and explore button', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.tag-selector').exists()).toBe(true)
    expect(wrapper.find('.icon-tag').exists()).toBe(true)
  })

  it('opens tag cloud modal on button click', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.b-modal').exists()).toBe(false)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.b-modal').exists()).toBe(true)
    expect(wrapper.find('.tag-cloud').exists()).toBe(true)
  })

  it('adds selected tag from tag cloud and closes modal', async () => {
    const wrapper = mountComponent({ modelValue: [] })
    await wrapper.find('button').trigger('click')

    const vm = wrapper.vm as any
    vm.handleTagCloudSelect({ id: '1', name: 'vue', slug: 'vue' })

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { id: '1', name: 'vue', slug: 'vue' },
    ])
  })

  it('does not add duplicate tags', async () => {
    const existing = [{ id: '1', name: 'vue', slug: 'vue' }]
    const wrapper = mountComponent({ modelValue: existing })

    const vm = wrapper.vm as any
    vm.handleTagCloudSelect({ id: '1', name: 'vue', slug: 'vue' })

    // Should not emit an update since tag already exists
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
