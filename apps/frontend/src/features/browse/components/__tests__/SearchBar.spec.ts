import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SearchBar from '../SearchBar.vue'
import { useSearchStore } from '@/features/browse/stores/searchStore'

// Stub onClickOutside — jsdom doesn't support pointer events for this composable
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { ...actual, onClickOutside: vi.fn() }
})

const SelectableTagList = {
  name: 'SelectableTagList',
  template: '<div class="selectable-tag-list" />',
  props: ['tags', 'selectable', 'removable'],
  emits: ['select', 'remove'],
}

const SearchInput = {
  name: 'SearchInput',
  template: '<div class="search-input-stub" />',
  props: ['modelValue'],
  emits: ['update:modelValue', 'home:set'],
}

const SearchResults = {
  name: 'SearchResults',
  template: '<div class="search-results-stub" />',
  props: ['results'],
  emits: ['select:profile'],
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
          SelectableTagList,
          SearchInput,
          SearchResults,
        },
      },
    })
  }

  it('reflects pre-existing store state in the tag selector', () => {
    const store = useSearchStore()
    store.setTags([{ id: 't1', name: 'Vue', slug: 'vue' }])

    const wrapper = mountComponent()
    const removableList = wrapper.findComponent({ name: 'SelectableTagList' })
    expect(removableList.props('tags')).toEqual([{ id: 't1', name: 'Vue', slug: 'vue' }])
  })
})
