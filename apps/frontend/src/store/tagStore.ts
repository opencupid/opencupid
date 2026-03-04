// import { createEntityStore } from './entityStore'
// import type { PublicTag, CreateTagInput } from '@zod/dto/tag.dto'
// import type { TagResponse, TagsResponse } from '@zod/apiResponse.dto'

// export const useTagsStore = createEntityStore<PublicTag, CreateTagInput>({
//   name: 'tags',
//   basePath: '/tags',
//   extractMany: (data: TagsResponse) => data.tags,
//   extractOne: (data: TagResponse) => data.tag,
//   createPath: '/tags',
//   updatePath: id => `/tags/${id}`,
//   deletePath: id => `/tags/${id}`,
// })

import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import {
  storeError,
  storeSuccess,
  type StoreError,
  type StoreSuccess,
  type StoreVoidSuccess,
} from '@/store/helpers'

import type { PublicTag, CreateTagPayload, PopularTag } from '@zod/tag/tag.dto'
import type { Tag } from '@zod/generated'
import type { TagResponse, TagsResponse, PopularTagsResponse } from '@zod/apiResponse.dto'

type TagStoreListResponse<T> = StoreSuccess<{ result: T[] }> | StoreError
type TagStoreItemResponse<T> = StoreSuccess<{ result: T }> | StoreError

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [] as PublicTag[],
    searchResults: [] as PublicTag[],
    currentTag: null as PublicTag | null,
    popularTags: [] as PopularTag[],
  }),

  actions: {
    /**
     * Fetch popular tags for the tag cloud
     */
    async fetchPopularTags(opts?: {
      country?: string
      limit?: number
    }): Promise<TagStoreListResponse<PopularTag>> {
      try {
        const res = await api.get<PopularTagsResponse>('/tags/popular', {
          params: opts,
        })
        this.popularTags = res.data.tags
        return storeSuccess({ result: this.popularTags })
      } catch (error: any) {
        this.popularTags = []
        return storeError(error, 'Failed to fetch popular tags')
      }
    },

    /**
     * Fetch all tags
     */
    async fetchAll(): Promise<TagStoreListResponse<PublicTag>> {
      try {
        const res = await api.get<TagsResponse>('/tags')
        this.tags = res.data.tags
        return storeSuccess({ result: this.tags })
      } catch (error: any) {
        this.tags = []
        return storeError(error, 'Failed to fetch tags')
      }
    },

    /**
     * Search tags for autocomplete
     */
    async search(q: string): Promise<TagStoreListResponse<PublicTag>> {
      try {
        const res = await api.get<TagsResponse>('/tags/search', {
          params: { q },
        })
        this.searchResults = res.data.tags
        return storeSuccess({ result: this.searchResults })
      } catch (error: any) {
        this.searchResults = []
        return storeError(error, 'Failed to search tags')
      }
    },

    /**
     * Get a single tag by ID
     */
    async getTag(id: string): Promise<TagStoreItemResponse<PublicTag>> {
      try {
        const res = await api.get<TagResponse>(`/tags/${id}`)
        const tag = res.data.tag
        this.currentTag = tag
        return storeSuccess({ result: tag })
      } catch (error: any) {
        this.currentTag = null
        return storeError(error, 'Failed to fetch tag')
      }
    },

    /**
     * Create a new tag
     */
    async create(input: CreateTagPayload): Promise<TagStoreItemResponse<PublicTag>> {
      try {
        const res = await api.post<TagResponse>('/tags', input)
        this.tags.push(res.data.tag)
        return storeSuccess({ result: res.data.tag })
      } catch (error: any) {
        return storeError(error, 'Failed to create tag')
      }
    },

    /**
     * Update an existing tag
     */
    async updateTag(id: string, input: Partial<Tag>): Promise<TagStoreItemResponse<PublicTag>> {
      try {
        const res = await api.patch<TagResponse>(`/tags/${id}`, input)
        const idx = this.tags.findIndex((t) => t.id === id)
        if (idx !== -1) this.tags.splice(idx, 1, res.data.tag)
        return storeSuccess({ result: res.data.tag })
      } catch (error: any) {
        return storeError(error, 'Failed to update tag')
      }
    },

    /**
     * Soft delete a tag
     */
    async deleteTag(id: string): Promise<StoreVoidSuccess | StoreError> {
      try {
        await api.delete(`/tags/${id}`)
        this.tags = this.tags.filter((t) => t.id !== id)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete tag')
      }
    },
  },
})
