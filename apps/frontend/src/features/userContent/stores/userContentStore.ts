import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import { OwnerUserContentSchema } from '@zod/userContent/publicContent.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import {
  OwnerPostSchema,
  PostSummarySchema,
  PublicPostDetailSchema,
  type CreatePostPayload,
  type UpdatePostPayload,
  type OwnerPost,
  type PostSummary,
  type PublicPostDetail,
} from '@zod/post/post.dto'
import {
  OwnerEventSchema,
  PublicEventDetailSchema,
  type CreateEventPayload,
  type UpdateEventPayload,
  type OwnerEvent,
  type PublicEventDetail,
} from '@zod/event/event.dto'
import {
  OwnerCommunitySchema,
  PublicCommunityDetailSchema,
  type CreateCommunityPayload,
  type UpdateCommunityPayload,
  type OwnerCommunity,
  type PublicCommunityDetail,
} from '@zod/community/community.dto'
import type {
  MyContentResponse,
  PostSummariesResponse,
  PublicPostDetailResponse,
  PublicEventDetailResponse,
  PublicCommunityDetailResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
  CreateEventResponse,
  UpdateEventResponse,
  DeleteEventResponse,
  CreateCommunityResponse,
  UpdateCommunityResponse,
  DeleteCommunityResponse,
} from '@zod/apiResponse.dto'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'
import type { MapBounds } from '@/features/map/types/map.types'

const OwnerUserContentArraySchema = OwnerUserContentSchema.array()
const PostSummaryArraySchema = PostSummarySchema.array()

type StoreMyContentResponse = StoreResponse<{ items: OwnerUserContent[] }>
type StorePostResponse = StoreResponse<{ post: OwnerPost }>
type StoreEventResponse = StoreResponse<{ event: OwnerEvent }>
type StoreCommunityResponse = StoreResponse<{ community: OwnerCommunity }>
type StorePostSummariesResponse = StoreResponse<{ posts: PostSummary[] }>

let publicPostAbortController: AbortController | null = null
let publicEventAbortController: AbortController | null = null
let publicCommunityAbortController: AbortController | null = null

/**
 * Single store for all user-content state and mutations. Holds the
 * unified `myContent` list (posts + events mixed chronologically),
 * the post-only map-bounds summaries, and per-kind CRUD that mirrors
 * its writes into `myContent` so the unified list stays in sync.
 *
 * Method naming: kind-prefixed for write/detail actions (createPost,
 * fetchPublicPost, …), unsuffixed for read actions over the unified
 * list (fetchMyContent, upsert, remove). The `postSummaries` /
 * `fetchPostsInBounds` pair stays kind-specific while the browse
 * map's marker UI is post-only.
 */
export const useUserContentStore = defineStore('userContent', {
  state: () => ({
    /** Owner-scoped unified list — populated by fetchMyContent. */
    myContent: [] as OwnerUserContent[],
    /** Map-bounds teasers — populated by fetchPostsInBounds. */
    postSummaries: [] as PostSummary[],
    isLoading: false,
    isInitialized: false,
  }),

  getters: {
    myPosts: (state) => state.myContent.filter((c) => c.kind === 'post'),
    myEvents: (state) => state.myContent.filter((c) => c.kind === 'event'),
    myCommunities: (state) => state.myContent.filter((c) => c.kind === 'community'),
  },

  actions: {
    // ─── Unified list reads ────────────────────────────────────────────
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

    /** Insert or update a single item. Idempotent. */
    upsert(item: OwnerUserContent) {
      const idx = this.myContent.findIndex((c) => c.id === item.id)
      if (idx === -1) {
        this.myContent.unshift(item)
      } else {
        this.myContent[idx] = item
      }
    },

    /** Remove an item by id. */
    remove(id: string) {
      this.myContent = this.myContent.filter((c) => c.id !== id)
    },

    // ─── Post CRUD ────────────────────────────────────────────────────
    async createPost(payload: CreatePostPayload): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.post<CreatePostResponse>('/content/posts', payload))
        const post = OwnerPostSchema.parse(res.data.post)
        this.upsert(post)
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
        this.upsert(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post')
      }
    },

    async deletePost(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeletePostResponse>(`/content/posts/${id}`))
        this.remove(id)
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
        this.upsert(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post visibility')
      }
    },

    hidePost(id: string) {
      return this.setPostVisibility(id, false)
    },

    showPost(id: string) {
      return this.setPostVisibility(id, true)
    },

    // ─── Event CRUD ───────────────────────────────────────────────────
    async createEvent(payload: CreateEventPayload): Promise<StoreEventResponse> {
      try {
        const res = await safeApiCall(() =>
          api.post<CreateEventResponse>('/content/events', payload)
        )
        const event = OwnerEventSchema.parse(res.data.event)
        this.upsert(event)
        return storeSuccess({ event })
      } catch (error: any) {
        return storeError(error, 'Failed to create event')
      }
    },

    async updateEvent(id: string, payload: UpdateEventPayload): Promise<StoreEventResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdateEventResponse>(`/content/events/${id}`, payload)
        )
        const event = OwnerEventSchema.parse(res.data.event)
        this.upsert(event)
        return storeSuccess({ event })
      } catch (error: any) {
        return storeError(error, 'Failed to update event')
      }
    },

    async deleteEvent(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeleteEventResponse>(`/content/events/${id}`))
        this.remove(id)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete event')
      }
    },

    // ─── Community CRUD ───────────────────────────────────────────────
    async createCommunity(payload: CreateCommunityPayload): Promise<StoreCommunityResponse> {
      try {
        const res = await safeApiCall(() =>
          api.post<CreateCommunityResponse>('/content/communities', payload)
        )
        const community = OwnerCommunitySchema.parse(res.data.community)
        this.upsert(community)
        return storeSuccess({ community })
      } catch (error: any) {
        return storeError(error, 'Failed to create community')
      }
    },

    async updateCommunity(
      id: string,
      payload: UpdateCommunityPayload
    ): Promise<StoreCommunityResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdateCommunityResponse>(`/content/communities/${id}`, payload)
        )
        const community = OwnerCommunitySchema.parse(res.data.community)
        this.upsert(community)
        return storeSuccess({ community })
      } catch (error: any) {
        return storeError(error, 'Failed to update community')
      }
    },

    async deleteCommunity(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeleteCommunityResponse>(`/content/communities/${id}`))
        this.remove(id)
        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete community')
      }
    },

    // ─── Post-only public reads ───────────────────────────────────────
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

    // ─── Event-only public reads ──────────────────────────────────────
    async fetchPublicEvent(
      id: string,
      signal?: AbortSignal
    ): Promise<StoreResponse<{ event: PublicEventDetail }>> {
      if (publicEventAbortController) publicEventAbortController.abort()
      const controller = new AbortController()
      publicEventAbortController = controller
      if (signal) {
        if (signal.aborted) controller.abort()
        else signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      try {
        const res = await safeApiCall(() =>
          api.get<PublicEventDetailResponse>(`/content/events/${id}`, {
            signal: controller.signal,
          })
        )
        const event = PublicEventDetailSchema.parse(res.data.event)
        return storeSuccess({ event })
      } catch (error: any) {
        if (error instanceof CanceledError) return storeSuccess()
        return storeError(error, 'Failed to fetch event')
      }
    },

    // ─── Community-only public reads ──────────────────────────────────
    async fetchPublicCommunity(
      id: string,
      signal?: AbortSignal
    ): Promise<StoreResponse<{ community: PublicCommunityDetail }>> {
      if (publicCommunityAbortController) publicCommunityAbortController.abort()
      const controller = new AbortController()
      publicCommunityAbortController = controller
      if (signal) {
        if (signal.aborted) controller.abort()
        else signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      try {
        const res = await safeApiCall(() =>
          api.get<PublicCommunityDetailResponse>(`/content/communities/${id}`, {
            signal: controller.signal,
          })
        )
        const community = PublicCommunityDetailSchema.parse(res.data.community)
        return storeSuccess({ community })
      } catch (error: any) {
        if (error instanceof CanceledError) return storeSuccess()
        return storeError(error, 'Failed to fetch community')
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
  },
})
