import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, computed } from 'vue'

import SearchBar from '../SearchBar.vue'
import { useSearchStore } from '@/features/browse/stores/searchStore'

// Stub onClickOutside — jsdom doesn't support pointer events for this composable
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return { ...actual, onClickOutside: vi.fn() }
})

// Stub useI18n — the real Tolgee-backed shim requires an active Tolgee
// instance which the test harness doesn't install.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: { value: 'en' },
  }),
}))

// Stub the geocoder composable — provider modules hit the network on import,
// which isn't relevant to SearchBar's own behavior.
vi.mock('@/features/geocoding/composables/useGeocoder', () => {
  const results = ref([])
  const isLoading = ref(false)
  const hasResults = computed(() => results.value.length > 0)
  return {
    useGeocoder: () => ({
      results,
      isLoading,
      hasResults,
      search: vi.fn(),
      setResults: vi.fn(),
      clear: vi.fn(),
    }),
  }
})

// Stub SVG-as-component imports — jsdom chokes parsing data-uri SVG src.
vi.mock('@/assets/icons/interface/home.svg', () => ({
  default: { template: '<span />' },
}))

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

const SearchRefiners = {
  name: 'SearchRefiners',
  template: '<div class="search-refiners-stub" />',
  props: ['tags', 'geocodedLocations', 'isLoading'],
  emits: ['tag:select', 'location:select'],
}

const SearchMatches = {
  name: 'SearchMatches',
  template: '<div class="search-matches-stub" />',
  props: ['profiles', 'posts'],
  emits: ['profile:select', 'post:select'],
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
          SearchRefiners,
          SearchMatches,
        },
        mocks: {
          $t: (k: string) => k,
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
