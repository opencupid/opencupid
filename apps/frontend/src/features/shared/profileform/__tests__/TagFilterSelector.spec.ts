import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/store/tagStore', () => ({ useTagsStore: () => ({ search: vi.fn(), create: vi.fn() }) }))
vi.mock('vue-multiselect', () => ({ default: { template: '<div />' } }))
vi.mock('../TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div class="tag-selector" />',
    props: ['modelValue', 'taggable', 'closeOnSelect', 'openDirection', 'initialOptions'],
    emits: ['update:modelValue'],
  },
}))
vi.mock('@/assets/icons/e-commerce/tag.svg', () => ({
  default: { template: '<svg class="icon-tag" />' },
}))

import TagFilterSelector from '../TagFilterSelector.vue'

describe('TagFilterSelector', () => {
  const mountComponent = (props = {}) =>
    mount(TagFilterSelector, {
      props: { modelValue: [], ...props },
      global: {
        mocks: { $t: (k: string) => k },
      },
    })

  it('renders the TagSelector child', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.tag-selector').exists()).toBe(true)
  })

  it('propagates TagSelector update:modelValue to its own v-model', async () => {
    const wrapper = mountComponent()
    const tag = { id: '1', name: 'vue', slug: 'vue' }

    await wrapper.findComponent({ name: 'TagSelector' }).vm.$emit('update:modelValue', [tag])

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([tag])
  })
})
