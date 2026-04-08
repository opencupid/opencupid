import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import BrowseFilterBar from '../BrowseFilterBar.vue'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'

const LocationFilterInput = {
  name: 'LocationFilterInput',
  template: '<div class="location-filter-input" />',
  props: ['modelValue', 'viewerProfile'],
  emits: ['update:modelValue', 'location:set-from-profile', 'location:fly-to'],
}

const TagSelector = {
  name: 'TagSelector',
  template: '<div class="tag-selector" />',
  props: ['modelValue', 'taggable', 'closeOnSelect', 'openDirection', 'initialOptions'],
  emits: ['update:modelValue', 'dropdown:open', 'dropdown:close'],
}

const availableTags = [
  { id: 't1', name: 'Vue', slug: 'vue' },
  { id: 't2', name: 'Pinia', slug: 'pinia' },
]

describe('BrowseFilterBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountComponent() {
    return mount(BrowseFilterBar, {
      props: {
        viewerProfile: null,
        availableTags,
      },
      global: {
        stubs: {
          LocationFilterInput,
          TagSelector,
        },
      },
    })
  }

  it('writes tag selection into the ephemeral browse filters store', async () => {
    const store = useBrowseFiltersStore()
    expect(store.selectedTagIds).toEqual([])

    const wrapper = mountComponent()
    wrapper.findComponent({ name: 'TagSelector' }).vm.$emit('update:modelValue', [
      { id: 't1', name: 'Vue', slug: 'vue' },
      { id: 't2', name: 'Pinia', slug: 'pinia' },
    ])
    await nextTick()

    expect(store.selectedTagIds).toEqual(['t1', 't2'])
  })

  it('reflects pre-existing store state in the tag selector', () => {
    const store = useBrowseFiltersStore()
    store.setTags(['t1'])

    const wrapper = mountComponent()
    const tagSelector = wrapper.findComponent({ name: 'TagSelector' })
    expect(tagSelector.props('modelValue')).toEqual([{ id: 't1', name: 'Vue', slug: 'vue' }])
  })

  it('emits location:fly-to when LocationFilterInput emits a location with coords', async () => {
    const wrapper = mountComponent()

    wrapper
      .findComponent({ name: 'LocationFilterInput' })
      .vm.$emit('location:fly-to', { lat: 51.5, lon: 4.45 })
    await nextTick()

    expect(wrapper.emitted('location:fly-to')).toEqual([[{ lat: 51.5, lon: 4.45 }]])
  })

  it('does not modify the store when location fly-to fires', async () => {
    const store = useBrowseFiltersStore()
    store.setTags(['t1'])

    const wrapper = mountComponent()
    wrapper
      .findComponent({ name: 'LocationFilterInput' })
      .vm.$emit('location:fly-to', { lat: 51.5, lon: 4.45 })
    await nextTick()

    expect(store.selectedTagIds).toEqual(['t1'])
  })
})
