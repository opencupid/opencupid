import { defineStore } from 'pinia'
import { CanceledError } from 'axios'
import { api, safeApiCall } from '@/lib/api'
import {
  PublicPostWithProfileSchema,
  PublicPostDetailSchema,
  OwnerPostSchema,
  PostSummarySchema,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
  type CreatePostPayload,
  type UpdatePostPayload,
  type PostQueryInput,
  type NearbyPostQueryInput,
  type PostScope,
} from '@zod/post/post.dto'
import type {
  PostsResponse,
  PostSummariesResponse,
  MyPostsResponse,
  PostResponse,
  PublicPostDetailResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { type PostTypeType } from '@zod/generated'
import { storeSuccess, storeError, type StoreResponse } from '@/store/helpers'
import type { MapBounds } from '@/features/map/types/map.types'

let publicPostAbortController: AbortController | null = null
const PublicPostWithProfileArraySchema = PublicPostWithProfileSchema.array()
const OwnerPostArraySchema = OwnerPostSchema.array()
const PostSummaryArraySchema = PostSummarySchema.array()
type StorePostResponse = StoreResponse<{ post: OwnerPost }>
type StorePostsResponse = StoreResponse<{ posts: PublicPostWithProfile[] }>
type StoreOwnerPostsResponse = StoreResponse<{ posts: OwnerPost[] }>
type StorePostSummariesResponse = StoreResponse<{ posts: PostSummary[] }>

export const usePostStore = defineStore('posts', {
  state: () => ({
    /** Public feed — populated by fetchPosts / fetchNearbyPosts / fetchRecentPosts. Full shape with conversationContext. */
    posts: [] as PublicPostWithProfile[],
    /** Owner-scoped post list — populated by fetchMyPosts. */
    myPosts: [] as OwnerPost[],
    /** Lightweight teasers for map-bounds rendering — populated by fetchPostsInBounds. No conversationContext / isOwn / isVisible. */
    postSummaries: [] as PostSummary[],
    currentPost: null as PublicPostWithProfile | OwnerPost | null,
  }),

  getters: {
    getPostsByType: (state) => (type: PostTypeType) => {
      return state.posts.filter((post) => post.type === type)
    },
    getOffers: (state) => state.posts.filter((post) => post.type === 'OFFER'),
    getRequests: (state) => state.posts.filter((post) => post.type === 'REQUEST'),
  },

  actions: {
    async createPost(payload: CreatePostPayload): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.post<CreatePostResponse>('/posts', payload))
        const post = OwnerPostSchema.parse(res.data.post)
        this.myPosts.unshift(post)
        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to create post')
      }
    },

    async updatePost(id: string, payload: UpdatePostPayload): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.patch<UpdatePostResponse>(`/posts/${id}`, payload))
        const post = OwnerPostSchema.parse(res.data.post)

        const index = this.myPosts.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.myPosts[index] = post
        }
        if (this.currentPost?.id === id) {
          this.currentPost = post
        }

        return storeSuccess({ post })
      } catch (error: any) {
        return storeError(error, 'Failed to update post')
      }
    },

    async deletePost(id: string): Promise<StoreResponse<void>> {
      try {
        await safeApiCall(() => api.delete<DeletePostResponse>(`/posts/${id}`))

        this.myPosts = this.myPosts.filter((post) => post.id !== id)
        this.posts = this.posts.filter((post) => post.id !== id)
        if (this.currentPost?.id === id) {
          this.currentPost = null
        }

        return storeSuccess()
      } catch (error: any) {
        return storeError(error, 'Failed to delete post')
      }
    },

    async setPostVisibility(id: string, isVisible: boolean): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() =>
          api.patch<UpdatePostResponse>(`/posts/${id}`, { isVisible })
        )
        const post = OwnerPostSchema.parse(res.data.post)

        const index = this.myPosts.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.myPosts[index] = post
        }

        if (post.isVisible) {
          this.upsertPost(post)
        } else {
          this.posts = this.posts.filter((p) => p.id !== id)
        }

        if (this.currentPost?.id === id) {
          this.currentPost = post
        }

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

    async loadPosts(
      scope: PostScope,
      options: {
        type?: PostTypeType
        page?: number
        pageSize?: number
        nearbyParams?: NearbyPostQueryInput
      } = {}
    ) {
      const { type, page = 0, pageSize = 20, nearbyParams } = options
      const baseQuery: PostQueryInput = {
        type,
        limit: pageSize,
        offset: page * pageSize,
      }
      switch (scope) {
        case 'nearby':
          if (nearbyParams) {
            return await this.fetchNearbyPosts({
              ...baseQuery,
              ...nearbyParams,
            })
          }
          return storeSuccess({ posts: [] as PublicPostWithProfile[] })
        case 'recent':
          return await this.fetchRecentPosts(baseQuery)
        case 'my':
          return await this.fetchMyPosts(baseQuery)
        default:
          return await this.fetchPosts(baseQuery)
      }
    },

    async fetchOwnerPost(id: string): Promise<StorePostResponse> {
      try {
        const res = await safeApiCall(() => api.get<PostResponse>(`/posts/${id}`))
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
          api.get<PublicPostDetailResponse>(`/posts/${id}`, { signal: controller.signal })
        )
        const post = PublicPostDetailSchema.parse(res.data.post)
        return storeSuccess({ post })
      } catch (error: any) {
        if (error instanceof CanceledError) return storeSuccess()
        return storeError(error, 'Failed to fetch post')
      }
    },

    async fetchPosts(query: PostQueryInput = {}): Promise<StorePostsResponse> {
      try {
        const res = await safeApiCall(() => api.get<PostsResponse>('/posts', { params: query }))
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch posts')
      }
    },

    async fetchNearbyPosts(query: NearbyPostQueryInput): Promise<StorePostsResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts/nearby', { params: query })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch nearby posts')
      }
    },

    async fetchRecentPosts(query: PostQueryInput = {}): Promise<StorePostsResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostsResponse>('/posts/recent', { params: query })
        )
        const posts = PublicPostWithProfileArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.posts = posts
        } else {
          this.posts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch recent posts')
      }
    },

    async fetchMyPosts(query: PostQueryInput = {}): Promise<StoreOwnerPostsResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<MyPostsResponse>('/posts/profile/me', { params: query })
        )
        const posts = OwnerPostArraySchema.parse(res.data.posts)

        if (query.offset === 0 || query.offset === undefined) {
          this.myPosts = posts
        } else {
          this.myPosts.push(...posts)
        }
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch my posts')
      }
    },

    async fetchPostsInBounds(bounds: MapBounds): Promise<StorePostSummariesResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<PostSummariesResponse>('/posts/bounds', { params: bounds })
        )
        const posts = PostSummaryArraySchema.parse(res.data.posts)
        this.postSummaries = posts
        return storeSuccess({ posts })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch posts in bounds')
      }
    },

    upsertPost(post: PublicPostWithProfile | OwnerPost) {
      const isOwn = 'isVisible' in post

      if (isOwn) {
        const idx = this.myPosts.findIndex((p) => p.id === post.id)
        if (idx === -1) {
          this.myPosts.unshift(post as OwnerPost)
        } else {
          this.myPosts[idx] = post as OwnerPost
        }
      }

      const idx = this.posts.findIndex((p) => p.id === post.id)
      if (idx === -1) {
        this.posts.unshift({ ...post, isOwn: true } as PublicPostWithProfile)
      } else {
        this.posts[idx] = { ...post, isOwn: true } as PublicPostWithProfile
      }
    },

    clearPosts() {
      this.posts = []
    },

    clearMyPosts() {
      this.myPosts = []
    },

    setCurrentPost(post: PublicPostWithProfile | OwnerPost | null) {
      this.currentPost = post
    },
  },
})
