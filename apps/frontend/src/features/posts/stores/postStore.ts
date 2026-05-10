import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import {
  PublicPostDetailSchema,
  OwnerPostSchema,
  PostSummarySchema,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
  type CreatePostPayload,
  type UpdatePostPayload,
} from '@zod/post/post.dto'
import type {
  PostSummariesResponse,
  PostResponse,
  PublicPostDetailResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'
import type { MapBounds } from '@/features/map/types/map.types'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'

let publicPostAbortController: AbortController | null = null
const PostSummaryArraySchema = PostSummarySchema.array()
type StorePostResponse = StoreResponse<{ post: OwnerPost }>
type StorePostSummariesResponse = StoreResponse<{ posts: PostSummary[] }>

/**
 * Post-specific store: kind-targeted CRUD + post-detail-by-id +
 * map-bounds summaries. The owner-scoped *list* of posts (mixed with
 * events) lives in `useUserContentStore`. CRUD actions here mirror
 * their writes into `useUserContentStore` so both stores stay in sync.
 *
 * `postSummaries` and `fetchPostsInBounds` remain post-specific while
 * the browse map's marker UI is post-only; generalizing them onto the
 * unified store is deferred until the map gains event-aware markers.
 */
export const usePostStore = defineStore('posts', {
  state: () => ({
    /** Map-bounds teasers — populated by fetchPostsInBounds. */
    postSummaries: [] as PostSummary[],
    /** Single-post detail — populated by fetchOwnerPost / fetchPublicPost. */
    currentPost: null as OwnerPost | null,
  }),

  actions: {
    async createPost(payload: CreatePostPayload): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.post<CreatePostResponse>('/content/posts', payload))
        const post = OwnerPostSchema.parse(res.data.post)
        useUserContentStore().upsert(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to create post')
      }
    },

    async updatePost(id: string, payload: UpdatePostPayload): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdatePostResponse>(`/content/posts/${id}`, payload)
        )
        const post = OwnerPostSchema.parse(res.data.post)
        if (this.currentPost?.id === id) {
          this.currentPost = post
        }
        useUserContentStore().upsert(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post')
      }
    },

    async deletePost(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeletePostResponse>(`/content/posts/${id}`))
        if (this.currentPost?.id === id) {
          this.currentPost = null
        }
        useUserContentStore().remove(id)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete post')
      }
    },

    async setPostVisibility(id: string, isVisible: boolean): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdatePostResponse>(`/content/posts/${id}`, { isVisible })
        )
        const post = OwnerPostSchema.parse(res.data.post)
        if (this.currentPost?.id === id) {
          this.currentPost = post
        }
        useUserContentStore().upsert(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post visibility')
      }
    },

    async hidePost(id: string) {
      return this.setPostVisibility(id, false)
    },

    async showPost(id: string) {
      return this.setPostVisibility(id, true)
    },

    async fetchOwnerPost(id: string): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.get<PostResponse>(`/content/posts/${id}`))
        const post = OwnerPostSchema.parse(res.data.post)
        this.currentPost = post
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch post')
      }
    },

    async fetchPublicPost(id: string): Promise<StoreResponse<{ post: PublicPostDetail }>> {
      if (publicPostAbortController) publicPostAbortController.abort()
      const controller = new AbortController()
      publicPostAbortController = controller

      try {
        const res = await safeApiCall(() =>
          api.get<PublicPostDetailResponse>(`/content/posts/${id}`, { signal: controller.signal })
        )
        const post = PublicPostDetailSchema.parse(res.data.post)
        return storeSuccess({ post })
      } catch (error: any) {
        if (error instanceof CanceledError) return storeSuccess()
        return storeError(error, 'Failed to fetch post')
      }
    },

    async fetchPostsInBounds(bounds: MapBounds): Promise<StorePostSummariesResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostSummariesResponse>('/content/posts/bounds', { params: bounds })
        )
        const posts = PostSummaryArraySchema.parse(res.data.posts)
        this.postSummaries = posts
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch posts in bounds')
      }
    },

    setCurrentPost(post: OwnerPost | null) {
      this.currentPost = post
    },
  },
})
