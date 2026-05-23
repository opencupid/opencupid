import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import type { PublicTag } from '@zod/tag/tag.dto'
import { MAX_BROWSE_TAGS } from '@shared/maps'
import { SearchResponseSchema, type SearchResponse } from '@shared/zod/search/search.dto'
import { storeSuccess, storeError, type StoreVoidSuccess, type StoreError } from '@/store/helpers'

let searchAbortController: AbortController | null = null

export const useSearchStore = defineStore('search', () => {
  const selectedTags = ref<PublicTag[]>([])
  const searchResults = ref<SearchResponse | null>(null)
  const isLoading = ref(false)

  const selectedTagIds = computed(() => selectedTags.value.map((t) => t.id))
  const hasResults = computed(() => {
    const r = searchResults.value
    return (
      !!r &&
      (r.profiles.length > 0 ||
        r.posts.length > 0 ||
        r.events.length > 0 ||
        r.communities.length > 0 ||
        r.tags.length > 0)
    )
  })

  function toggleTag(tag: PublicTag) {
    const idx = selectedTags.value.findIndex((t) => t.id === tag.id)
    if (idx === -1) {
      if (selectedTags.value.length >= MAX_BROWSE_TAGS) return
      selectedTags.value = [...selectedTags.value, tag]
    } else {
      selectedTags.value = selectedTags.value.filter((t) => t.id !== tag.id)
    }
  }

  function setTags(tags: PublicTag[]) {
    selectedTags.value = tags.slice(0, MAX_BROWSE_TAGS)
  }

  function clearTags() {
    selectedTags.value = []
  }

  async function search(q: string): Promise<StoreVoidSuccess | StoreError> {
    if (searchAbortController) {
      searchAbortController.abort()
    }
    const controller = new AbortController()
    searchAbortController = controller
    isLoading.value = true

    try {
      const res = await safeApiCall(() =>
        api.get('/search', { params: { q }, signal: controller.signal })
      )
      const parsed = SearchResponseSchema.parse(res.data)
      searchResults.value = parsed
      return storeSuccess()
    } catch (error: any) {
      if (error instanceof CanceledError) {
        searchResults.value = null
        return storeSuccess()
      }
      return storeError(error, 'Search failed')
    } finally {
      if (searchAbortController === controller) {
        searchAbortController = null
        isLoading.value = false
      }
    }
  }

  function reset() {
    selectedTags.value = []
    searchResults.value = null
    if (searchAbortController) {
      searchAbortController.abort()
      searchAbortController = null
    }
  }

  return {
    selectedTags,
    searchResults,
    isLoading,
    selectedTagIds,
    hasResults,
    toggleTag,
    setTags,
    clearTags,
    search,
    reset,
  }
})

bus.on('auth:logout', () => {
  useSearchStore().reset()
})
