import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import { OwnerUserContentSchema } from '@zod/userContent/publicContent.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import type { MyContentResponse } from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'

const OwnerUserContentArraySchema = OwnerUserContentSchema.array()
type StoreMyContentResponse = StoreResponse<{ items: OwnerUserContent[] }>

/**
 * Owner-scoped store for the unified UserContent list (posts + events
 * mixed, sorted chronologically). Backed by `GET /api/content/me`.
 *
 * Per-kind CRUD continues to live in the per-kind stores
 * (`usePostStore`, `useEventStore`). This store is *only* the owner
 * list; mutations from the kind-specific stores are reflected here via
 * `upsert` / `remove` helpers called by their actions.
 */
export const useUserContentStore = defineStore('userContent', {
  state: () => ({
    myContent: [] as OwnerUserContent[],
    isLoading: false,
    isInitialized: false,
  }),

  getters: {
    myPosts: (state) => state.myContent.filter((c) => c.kind === 'post'),
    myEvents: (state) => state.myContent.filter((c) => c.kind === 'event'),
  },

  actions: {
    async fetchMyContent(
      query: { limit?: number; offset?: number } = {}
    ): Promise<StoreMyContentResponse> {
      this.isLoading = true
      try {
        const res = await safeApiCall(() =>
          api.get<MyContentResponse>('/content/me', { params: query })
        )
        const items = OwnerUserContentArraySchema.parse(res.data.items)

        if (query.offset === 0 || query.offset === undefined) {
          this.myContent = items
        } else {
          this.myContent.push(...items)
        }
        this.isInitialized = true
        return storeSuccess({ items })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch my content')
      } finally {
        this.isLoading = false
      }
    },

    /** Insert or update a single item — called by per-kind stores after create/update. */
    upsert(item: OwnerUserContent) {
      const idx = this.myContent.findIndex((c) => c.id === item.id)
      if (idx === -1) {
        this.myContent.unshift(item)
      } else {
        this.myContent[idx] = item
      }
    },

    /** Remove an item by id — called by per-kind stores after delete. */
    remove(id: string) {
      this.myContent = this.myContent.filter((c) => c.id !== id)
    },
  },
})
