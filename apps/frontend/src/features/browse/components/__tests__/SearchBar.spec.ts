import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SearchBar from '../SearchBar.vue'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'

// Stub onClickOutside — jsdom doesn't support pointer events for this composable
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { ...actual, onClickOutside: vi.fn() }
})

const LocationFilterInput = {
  name: 'LocationFilterInput',
  template: '<div class="location-filter-input" />',
  props: ['modelValue', 'viewerProfile'],
  emits: ['update:modelValue', 'location:set'],
}

const SelectableTagList = {
  name: 'SelectableTagList',
  template: '<div class="selectable-tag-list" />',
  props: ['tags', 'selectable', 'removable'],
  emits: ['select', 'remove'],
}

const availableTags = [
  { id: 't1', name: 'Vue', slug: 'vue' },
  { id: 't2', name: 'Pinia', slug: 'pinia' },
]

describe('SearchBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountComponent() {
    return mount(SearchBar, {
      props: {
        viewerProfile: null,
        availableTags,
      },
      global: {
        stubs: {
          LocationFilterInput,
          SelectableTagList,
        },
      },
    })
  }

  // Helper: the template renders two SelectableTagList instances:
  // [0] = removable (selected tags in pill), [1] = selectable (dropdown panel)
  function getTagLists(wrapper: ReturnType<typeof mountComponent>) {
    const all = wrapper.findAllComponents({ name: 'SelectableTagList' })
    return { removableList: all[0]!, selectableList: all[1]! }
  }

  it('writes tag selection into the ephemeral browse filters store', async () => {
    const store = useBrowseFiltersStore()
    expect(store.selectedTagIds).toEqual([])

    const wrapper = mountComponent()
    const { selectableList } = getTagLists(wrapper)
    selectableList.vm.$emit('select', { id: 't1', name: 'Vue', slug: 'vue' })
    await nextTick()

    expect(store.selectedTagIds).toEqual(['t1'])
  })

  it('reflects pre-existing store state in the tag selector', () => {
    const store = useBrowseFiltersStore()
    store.setTags([{ id: 't1', name: 'Vue', slug: 'vue' }])

    const wrapper = mountComponent()
    const { removableList } = getTagLists(wrapper)
    expect(removableList.props('tags')).toEqual([{ id: 't1', name: 'Vue', slug: 'vue' }])
  })

  it('renders selected tags that are NOT in availableTags', async () => {
    const store = useBrowseFiltersStore()
    const wrapper = mountComponent()

    const offBoundsTag = { id: 'tag-out-of-bounds', name: 'Biokertészet', slug: 'biokerteszet' }
    const { selectableList, removableList } = getTagLists(wrapper)
    selectableList.vm.$emit('select', offBoundsTag)
    await nextTick()

    expect(store.selectedTagIds).toEqual(['tag-out-of-bounds'])
    expect(removableList.props('tags')).toEqual([offBoundsTag])
  })

  it('emits location:set when LocationFilterInput emits a location with coords', async () => {
    const wrapper = mountComponent()

    wrapper
      .findComponent({ name: 'LocationFilterInput' })
      .vm.$emit('location:set', { lat: 51.5, lon: 4.45 })
    await nextTick()

    expect(wrapper.emitted('location:set')).toEqual([[{ lat: 51.5, lon: 4.45 }]])
  })

  it('clears tag selection when location:set fires', async () => {
    const store = useBrowseFiltersStore()
    store.setTags([{ id: 't1', name: 'Vue', slug: 'vue' }])

    const wrapper = mountComponent()
    wrapper
      .findComponent({ name: 'LocationFilterInput' })
      .vm.$emit('location:set', { lat: 51.5, lon: 4.45 })
    await nextTick()

    expect(store.selectedTagIds).toEqual([])
  })
})
