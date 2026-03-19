import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import BrowseFilterBar from '../BrowseFilterBar.vue'

const LocationFilterInput = {
  name: 'LocationFilterInput',
  template: '<div class="location-filter-input" />',
  props: ['modelValue', 'viewerProfile'],
  emits: ['update:modelValue', 'location:set-from-profile'],
}

const TagFilterSelector = {
  name: 'TagFilterSelector',
  template: '<div class="tag-filter-selector" />',
  props: ['modelValue', 'initialOptions'],
  emits: ['update:modelValue', 'filter:changed'],
}

describe('BrowseFilterBar', () => {
  function mountComponent() {
    return mount(BrowseFilterBar, {
      props: {
        modelValue: {
          location: { country: 'US', cityName: 'New York', lat: null, lon: null },
          tags: [],
        },
        viewerProfile: null,
      },
      global: {
        stubs: {
          LocationFilterInput,
          TagFilterSelector,
        },
      },
    })
  }

  it('emits filter:changed when tag selection updates v-model tags', async () => {
    vi.useFakeTimers()
    const wrapper = mountComponent()

    wrapper
      .findComponent({ name: 'TagFilterSelector' })
      .vm.$emit('update:modelValue', [{ id: '1', name: 'vue', slug: 'vue' }])
    await nextTick()
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(wrapper.emitted('filter:changed')).toHaveLength(1)
    vi.useRealTimers()
  })
})
