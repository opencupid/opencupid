import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'
import type { UserContentKind } from '@shared/maps'
import {
  BROWSE_LIST_DEFAULT_LIMIT,
  BrowseListResponseSchema,
  type BrowseListItem,
} from '@zod/browse/browseList.dto'
import type { MapBounds } from '@/features/map/types/map.types'
import { storeSuccess, storeError, type StoreVoidSuccess, type StoreError } from '@/store/helpers'

/** What the grid is showing: the map area plus the shared tag and layer filters. */
export interface BrowseGridQuery {
  bounds: MapBounds
  tagIds: string[]
  kinds: UserContentKind[]
}

function querySignature(q: BrowseGridQuery): string {
  const { south, north, west, east } = q.bounds
  return [south, north, west, east, [...q.tagIds].sort(), [...q.kinds].sort()].join('|')
}

/**
 * Paged, nearest-first list behind the browse grid (GET /find/list). The grid
 * mirrors the map, so `load()` is called with the map's current bounds and
 * filters; `loadMore()` appends the next page.
 */
export const useBrowseGridStore = defineStore('browseGrid', () => {
  const items = ref<BrowseListItem[]>([])
  const total = ref(0)
  const hasMore = ref(false)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)

  let currentQuery: BrowseGridQuery | null = null
  let currentSignature: string | null = null
  let abortController: AbortController | null = null

  async function fetchPage(offset: number) {
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller
    const q = currentQuery!
    const res = await safeApiCall(() =>
      api.get('/find/list', {
        params: {
          ...q.bounds,
          tagIds: q.tagIds.length > 0 ? q.tagIds.join(',') : undefined,
          kinds: q.kinds.join(','),
          limit: BROWSE_LIST_DEFAULT_LIMIT,
          offset,
        },
        signal: controller.signal,
      })
    )
    return BrowseListResponseSchema.parse(res.data)
  }

  /** Loads the first page for `query`. A repeat call with the same query is a no-op. */
  async function load(query: BrowseGridQuery): Promise<StoreVoidSuccess | StoreError> {
    const signature = querySignature(query)
    if (signature === currentSignature) return storeSuccess()
    currentQuery = query
    currentSignature = signature
    items.value = []
    total.value = 0
    hasMore.value = false
    isLoading.value = true
    isLoadingMore.value = false
    try {
      const page = await fetchPage(0)
      items.value = page.items
      total.value = page.total
      hasMore.value = page.hasMore
      isLoading.value = false
      return storeSuccess()
    } catch (error) {
      if (error instanceof CanceledError) return storeSuccess()
      isLoading.value = false
      currentSignature = null
      return storeError(error, 'Failed to load nearby items')
    }
  }

  async function loadMore(): Promise<StoreVoidSuccess | StoreError> {
    if (!currentQuery || !hasMore.value || isLoading.value || isLoadingMore.value) {
      return storeSuccess()
    }
    isLoadingMore.value = true
    try {
      const page = await fetchPage(items.value.length)
      items.value = [...items.value, ...page.items]
      total.value = page.total
      hasMore.value = page.hasMore
      isLoadingMore.value = false
      return storeSuccess()
    } catch (error) {
      if (error instanceof CanceledError) return storeSuccess()
      isLoadingMore.value = false
      return storeError(error, 'Failed to load more items')
    }
  }

  /** Reloads the current query from the first page, e.g. after the data changed. */
  async function refresh(): Promise<StoreVoidSuccess | StoreError> {
    if (!currentQuery) return storeSuccess()
    currentSignature = null
    return load(currentQuery)
  }

  function reset() {
    abortController?.abort()
    abortController = null
    currentQuery = null
    currentSignature = null
    items.value = []
    total.value = 0
    hasMore.value = false
    isLoading.value = false
    isLoadingMore.value = false
  }

  return { items, total, hasMore, isLoading, isLoadingMore, load, loadMore, refresh, reset }
})

bus.on('auth:logout', () => {
  useBrowseGridStore().reset()
})

// Same triggers that rebuild the map clusters: the list reads the same index.
for (const event of [
  'profile:dating-prefs-updated',
  'profile:blocked',
  'usercontent:mutated',
] as const) {
  bus.on(event, () => {
    useBrowseGridStore().refresh()
  })
}
