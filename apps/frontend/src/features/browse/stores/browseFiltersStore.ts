import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import type { PublicTag } from '@zod/tag/tag.dto'
import { MAX_BROWSE_TAGS } from '@shared/maps'
import { SearchResponseSchema, type SearchResponse } from '@shared/zod/search/search.dto'
import { storeSuccess, storeError, type StoreVoidSuccess, type StoreError } from '@/store/helpers'

let searchAbortController: AbortController | null = null

/**
 * Ephemeral, client-side filter state for the browse map. State lives only
 * for the session: no persistence to localStorage, sessionStorage, or the
 * backend. Selections reset on page reload and on logout.
 *
 * The store holds full `PublicTag` objects (not just IDs) so that the
 * filter bar can render the selected pill regardless of whether the tag
 * is currently in the bounds-scoped `availableTags` list. Without this,
 * tags picked via the autocomplete search (which queries the global tag
 * store, not just the in-viewport list) would briefly show up and then
 * disappear from the UI.
 */
interface BrowseFiltersState {
  selectedTags: PublicTag[]
  searchResults: SearchResponse | null
}

export const useBrowseFiltersStore = defineStore('browseFilters', {
  state: (): BrowseFiltersState => ({
    selectedTags: [],
    searchResults: null,
  }),

  getters: {
    selectedTagIds(state): string[] {
      return state.selectedTags.map((t) => t.id)
    },
  },

  actions: {


    
    toggleTag(tag: PublicTag) {
      const idx = this.selectedTags.findIndex((t) => t.id === tag.id)
      if (idx === -1) {
        if (this.selectedTags.length >= MAX_BROWSE_TAGS) return
        this.selectedTags = [...this.selectedTags, tag]
      } else {
        this.selectedTags = this.selectedTags.filter((t) => t.id !== tag.id)
      }
    },

    setTags(tags: PublicTag[]) {
      this.selectedTags = tags.slice(0, MAX_BROWSE_TAGS)
    },

    clearTags() {
      this.selectedTags = []
    },

    async search(q: string): Promise<StoreVoidSuccess | StoreError> {
      if (searchAbortController) {
        searchAbortController.abort()
      }
      const controller = new AbortController()
      searchAbortController = controller

      try {
        const res = await safeApiCall(() =>
          api.get('/search', { params: { q }, signal: controller.signal })
        )
        const parsed = SearchResponseSchema.parse(res.data)
        this.searchResults = parsed
        return storeSuccess()
      } catch (error: any) {
        if (error instanceof CanceledError) {
          this.searchResults = null
          return storeSuccess()
        }
        return storeError(error, 'Search failed')
      } finally {
        if (searchAbortController === controller) {
          searchAbortController = null
        }
      }
    },

    reset() {
      this.selectedTags = []
      this.searchResults = null
      if (searchAbortController) {
        searchAbortController.abort()
        searchAbortController = null
      }
    },
  },
})

bus.on('auth:logout', () => {
  useBrowseFiltersStore().reset()
})
