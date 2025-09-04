import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import type {
  CreatePostPayload,
  UpdatePostPayload,
  PublicPostWithProfile,
  OwnerPost,
  PostQueryInput,
  NearbyPostQueryInput,
} from '@zod/post/post.dto'
import type {
  PostsResponse,
  PostResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
import { PostType } from '@prisma/client'
import type { PostTypeType } from '@zod/generated'

export const usePostStore = defineStore('posts', {
  state: () => ({
    posts: [] as PublicPostWithProfile[],
    myPosts: [] as OwnerPost[],
    currentPost: null as PublicPostWithProfile | OwnerPost | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    getPostById: (state) => (id: string) => {
      return state.posts.find(post => post.id === id) ||
        state.myPosts.find(post => post.id === id)
    },
    getPostsByType: (state) => (type: PostType) => {
      return state.posts.filter(post => post.type === type)
    },
    getOffers: (state) => state.posts.filter(post => post.type === 'OFFER'),
    getRequests: (state) => state.posts.filter(post => post.type === 'REQUEST'),
  },

  actions: {
    async createPost(payload: CreatePostPayload) {
      this.isLoading = true
      this.error = null

      try {
        const r = await safeApiCall<{ data: CreatePostResponse }>(
          () => api.post('/posts', payload)
        )

        const response = r.data

        if (response.success) {
          this.myPosts.unshift(response.post)
          return response.post
        } else {
          this.error = 'Failed to create post'
          return null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to create post'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async updatePost(id: string, payload: UpdatePostPayload) {
      this.isLoading = true
      this.error = null

      try {
        const r = await safeApiCall<{data:UpdatePostResponse}>(
          () => api.patch(`/posts/${id}`, payload)
        )
        const response = r.data

        if (response.success) {
          // Update in myPosts array
          const index = this.myPosts.findIndex(post => post.id === id)
          if (index !== -1) {
            this.myPosts[index] = response.post
          }

          // Update current post if it's the same
          if (this.currentPost?.id === id) {
            this.currentPost = response.post
          }

          return response.post
        } else {
          this.error = 'Failed to update post'
          return null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to update post'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async deletePost(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const r = await safeApiCall<{data:DeletePostResponse}>(
          () => api.delete(`/posts/${id}`)
        )
        const response = r.data

        if (response.success) {
          // Remove from myPosts
          this.myPosts = this.myPosts.filter(post => post.id !== id)

          // Remove from posts if it exists there
          this.posts = this.posts.filter(post => post.id !== id)

          // Clear current post if it's the same
          if (this.currentPost?.id === id) {
            this.currentPost = null
          }

          return true
        } else {
          this.error = 'Failed to delete post'
          return false
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete post'
        return false
      } finally {
        this.isLoading = false
      }
    },

    async loadPosts(scope: 'all' | 'nearby' | 'recent' | 'my', options: {
      type?: PostTypeType
      page?: number
      pageSize?: number
      nearbyParams?: { lat: number; lon: number; radius?: number }
    } = {}) {
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
              lat: nearbyParams.lat,
              lon: nearbyParams.lon,
              radius: nearbyParams.radius ?? 50,
            })
          }
          return []
        case 'recent':
          return await this.fetchRecentPosts(baseQuery)
        case 'my':
          return await this.fetchMyPosts(baseQuery)
        default:
          return await this.fetchPosts(baseQuery)
      }
    },

    async fetchPost(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const r = await safeApiCall<{data:PostResponse}>(
          () => api.get(`/posts/${id}`)
        )
        const response = r.data

        if (response.success) {
          this.currentPost = response.post
          return response.post
        } else {
          this.error = 'Failed to fetch post'
          return null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch post'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async fetchPosts(query: PostQueryInput = {}) {
      this.isLoading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (query.type) params.set('type', query.type)
        if (query.limit) params.set('limit', query.limit.toString())
        if (query.offset) params.set('offset', query.offset.toString())

        const r = await safeApiCall<{ data: PostsResponse }>(
          () => api.get(`/posts?${params.toString()}`)
        )
        const response = r.data

        console.log('Fetched posts response:', response)
        if (response.success) {
          if (query.offset === 0) {
            this.posts = response.posts
          } else {
            this.posts.push(...response.posts)
          }
          return response.posts
        } else {
          this.error = 'Failed to fetch posts'
          return []
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch posts exception'
        return []
      } finally {
        this.isLoading = false
      }
    },

    async fetchNearbyPosts(query: NearbyPostQueryInput) {
      this.isLoading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        params.set('lat', query.lat.toString())
        params.set('lon', query.lon.toString())
        params.set('radius', (query.radius || 50).toString())
        if (query.type) params.set('type', query.type)
        if (query.limit) params.set('limit', query.limit.toString())
        if (query.offset) params.set('offset', query.offset.toString())

        const r = await safeApiCall<{ data: PostsResponse }>(
          () => api.get(`/posts/nearby?${params.toString()}`)
        )
        const response = r.data

        if (response.success) {
          if (query.offset === 0) {
            this.posts = response.posts
          } else {
            this.posts.push(...response.posts)
          }
          return response.posts
        } else {
          this.error = 'Failed to fetch nearby posts'
          return []
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch nearby posts'
        return []
      } finally {
        this.isLoading = false
      }
    },

    async fetchRecentPosts(query: PostQueryInput = {}) {
      this.isLoading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (query.type) params.set('type', query.type)
        if (query.limit) params.set('limit', query.limit.toString())
        if (query.offset) params.set('offset', query.offset.toString())

        const r = await safeApiCall<{ data: PostsResponse }>(
          () => api.get(`/posts/recent?${params.toString()}`)
        )
        const response = r.data

        if (response.success) {
          if (query.offset === 0) {
            this.posts = response.posts
          } else {
            this.posts.push(...response.posts)
          }
          return response.posts
        } else {
          this.error = 'Failed to fetch recent posts'
          return []
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch recent posts'
        return []
      } finally {
        this.isLoading = false
      }
    },

    async fetchMyPosts(query: PostQueryInput = {}) {
      this.isLoading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (query.type) params.set('type', query.type)
        if (query.limit) params.set('limit', query.limit.toString())
        if (query.offset) params.set('offset', query.offset.toString())

        // We'll need to get the current profile ID from auth store
        // For now, we'll use a placeholder endpoint
        const r = await safeApiCall<{ data: PostsResponse }>(
          () => api.get(`/posts/profile/me?${params.toString()}`)
        )
        const response = r.data

        if (response.success) {
          if (query.offset === 0) {
            this.myPosts = response.posts as any[]
          } else {
            this.myPosts.push(...(response.posts as any[]))
          }
          return response.posts
        } else {
          this.error = 'Failed to fetch my posts'
          return []
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch my posts'
        return []
      } finally {
        this.isLoading = false
      }
    },

    clearPosts() {
      this.posts = []
    },

    clearMyPosts() {
      this.myPosts = []
    },

    clearError() {
      this.error = null
    },

    setCurrentPost(post: PublicPostWithProfile | OwnerPost | null) {
      this.currentPost = post
    },
  },
})