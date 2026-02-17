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
import { api, axios } from '@/lib/api'

import type { PublicTag, CreateTagInput, CreateTagPayload } from '@zod/tag/tag.dto'
import type { Tag } from '@zod/generated'
import type { TagResponse, TagsResponse, ApiError } from '@zod/apiResponse.dto'

interface ServiceError {
  success: false
  message: string
  fieldErrors?: Record<string, string[]>
}

type ServiceResponse<T> = { success: true; data: T } | ServiceError

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [] as PublicTag[],
    searchResults: [] as PublicTag[],
    currentTag: null as PublicTag | null,
  }),

  actions: {
    /**
     * Fetch all tags
     */
    async fetchAll(): Promise<PublicTag[]> {
      try {
        const res = await api.get<TagsResponse>('/tags')
        this.tags = res.data.tags
        return this.tags
      } catch (error: any) {
        console.error('Failed to fetch tags:', error)
        throw error.response?.data?.message || 'Failed to fetch tags'
      }
    },

    /**
     * Search tags for autocomplete
     */
    async search(q: string): Promise<PublicTag[]> {
      try {
        const res = await api.get<TagsResponse>('/tags/search', {
          params: { q },
        })
        this.searchResults = res.data.tags
        return this.searchResults
      } catch (error: any) {
        console.error('Failed to search tags:', error)
        throw error.response?.data?.message || 'Failed to search tags'
      }
    },

    /**
     * Get a single tag by ID
     */
    async getTag(id: string): Promise<PublicTag> {
      try {
        const res = await api.get<TagResponse>(`/tags/${id}`)
        this.currentTag = res.data.tag
        return this.currentTag
      } catch (error: any) {
        console.error(`Failed to fetch tag ${id}:`, error)
        throw error.response?.data?.message || 'Failed to fetch tag'
      }
    },

    /**
     * Create a new tag
     */
    async create(input: CreateTagPayload): Promise<PublicTag> {
      try {
        const res = await api.post<TagResponse>('/tags', input)
        this.tags.push(res.data.tag)
        return res.data.tag
      } catch (error: any) {
        console.error('Failed to create tag:', error)
        if (axios.isAxiosError(error) && error.response) {
          const errData = error.response.data as ServiceError
          throw errData.message
        }
        throw 'Failed to create tag'
      }
    },

    /**
     * Update an existing tag
     */
    async updateTag(id: string, input: Partial<Tag>): Promise<PublicTag> {
      try {
        const res = await api.patch<TagResponse>(`/tags/${id}`, input)
        const idx = this.tags.findIndex((t) => t.id === id)
        if (idx !== -1) this.tags.splice(idx, 1, res.data.tag)
        return res.data.tag
      } catch (error: any) {
        console.error(`Failed to update tag ${id}:`, error)
        throw error.response?.data?.message || 'Failed to update tag'
      }
    },

    /**
     * Soft delete a tag
     */
    async deleteTag(id: string): Promise<void> {
      try {
        await api.delete(`/tags/${id}`)
        this.tags = this.tags.filter((t) => t.id !== id)
      } catch (error: any) {
        console.error(`Failed to delete tag ${id}:`, error)
        throw error.response?.data?.message || 'Failed to delete tag'
      }
    },
  },
})
