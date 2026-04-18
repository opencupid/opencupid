import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockApi = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

import { usePostStore } from '../postStore'

// Valid CUIDs for test fixtures (PostSchema.id uses z.string().cuid())
const CUID_1 = 'cmc7t45x400086w39gj30pzn3'
const CUID_2 = 'cmc7t45x400086w39gj30pzn4'
const CUID_3 = 'cmc7t45x400086w39gj30pzn5'
const CUID_NEW = 'cmc7t45x400086w39gj30pzn6'

// Minimal valid post objects that satisfy Zod schemas.
const basePost = {
  content: 'test',
  type: 'OFFER',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  postedById: CUID_1,
  country: null,
  cityName: null,
  lat: null,
  lon: null,
}

const profileSummary = {
  id: CUID_1,
  publicName: 'Test',
  profileImages: [],
  location: { country: '' },
}

function makePublicPost(id: string) {
  return {
    ...basePost,
    id,
    postedBy: profileSummary,
    isOwn: false,
  }
}

function makeOwnerPost(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...basePost,
    id,
    postedBy: profileSummary,
    isDeleted: false,
    isVisible: true,
    isOwn: true,
    ...overrides,
  }
}

describe('postStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Zod parsing', () => {
    it('coerces ISO string dates to Date objects on fetchPosts', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost(CUID_1)] },
      })

      const result = await store.fetchPosts({ limit: 20, offset: 0 })

      expect(result.success).toBe(true)
      expect(store.posts[0]!.createdAt).toBeInstanceOf(Date)
      expect(store.posts[0]!.updatedAt).toBeInstanceOf(Date)
    })

    it('coerces ISO string dates to Date objects on fetchMyPosts', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makeOwnerPost(CUID_1)] },
      })

      const result = await store.fetchMyPosts({ limit: 20, offset: 0 })

      expect(result.success).toBe(true)
      expect(store.myPosts[0]!.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('deletePost', () => {
    it('removes post from store state and returns StoreResponse', async () => {
      const store = usePostStore()
      store.myPosts = [{ id: CUID_1 } as any]
      store.posts = [{ id: CUID_1 } as any]
      store.currentPost = { id: CUID_1 } as any
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deletePost(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.delete).toHaveBeenCalledWith(`/posts/${CUID_1}`)
      expect(store.myPosts).toEqual([])
      expect(store.posts).toEqual([])
      expect(store.currentPost).toBeNull()
    })

    it('returns storeError on failure', async () => {
      const store = usePostStore()
      mockApi.delete.mockRejectedValue(new Error('network error'))

      const result = await store.deletePost(CUID_1)

      expect(result.success).toBe(false)
    })
  })

  describe('hidePost / showPost', () => {
    it('hidePost updates myPosts and removes hidden post from public list', async () => {
      const store = usePostStore()
      const hiddenPost = makeOwnerPost(CUID_1, { isVisible: false })
      store.myPosts = [{ id: CUID_1, isVisible: true } as any]
      store.posts = [{ id: CUID_1 } as any, { id: CUID_2 } as any]
      store.currentPost = { id: CUID_1, isVisible: true } as any
      mockApi.patch.mockResolvedValue({ data: { success: true, post: hiddenPost } })

      const result = await store.hidePost(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.patch).toHaveBeenCalledWith(`/posts/${CUID_1}`, { isVisible: false })
      expect(store.myPosts[0]!.isVisible).toBe(false)
      expect(store.posts.map((p) => p.id)).toEqual([CUID_2])
    })

    it('showPost updates visibility to true', async () => {
      const store = usePostStore()
      const visiblePost = makeOwnerPost(CUID_1, { isVisible: true })
      store.myPosts = [{ id: CUID_1, isVisible: false } as any]
      store.posts = [{ id: CUID_2 } as any]
      store.currentPost = { id: CUID_1, isVisible: false } as any
      mockApi.patch.mockResolvedValue({ data: { success: true, post: visiblePost } })

      const result = await store.showPost(CUID_1)

      expect(result.success).toBe(true)
      expect(store.myPosts[0]!.isVisible).toBe(true)
    })
  })

  describe('pagination — fetchPosts', () => {
    it('replaces posts on initial load (offset 0)', async () => {
      const store = usePostStore()
      store.posts = [{ id: CUID_3 } as any]
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost(CUID_1), makePublicPost(CUID_2)] },
      })

      await store.fetchPosts({ limit: 20, offset: 0 })

      expect(store.posts.map((p) => p.id)).toEqual([CUID_1, CUID_2])
    })

    it('appends posts when offset > 0 (load more)', async () => {
      const store = usePostStore()
      store.posts = [{ id: CUID_1 } as any]
      mockApi.get.mockResolvedValue({
        data: { success: true, posts: [makePublicPost(CUID_2)] },
      })

      await store.fetchPosts({ limit: 20, offset: 20 })

      expect(store.posts.map((p) => p.id)).toEqual([CUID_1, CUID_2])
    })

    it('passes query as Axios params object', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.fetchPosts({ limit: 20, offset: 40 })

      expect(mockApi.get).toHaveBeenCalledWith('/posts', {
        params: { limit: 20, offset: 40 },
      })
    })
  })

  describe('pagination — loadPosts', () => {
    it('calculates offset from page * pageSize', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.loadPosts('all', { page: 2, pageSize: 20 })

      expect(mockApi.get).toHaveBeenCalledWith('/posts', {
        params: { limit: 20, offset: 40 },
      })
    })
  })

  describe('createPost', () => {
    it('parses response and prepends to myPosts', async () => {
      const store = usePostStore()
      const newPost = makeOwnerPost(CUID_NEW)
      mockApi.post.mockResolvedValue({ data: { success: true, post: newPost } })

      const result = await store.createPost({
        content: 'hello',
        type: 'OFFER',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data!.post.id).toBe(CUID_NEW)
        expect(result.data!.post.createdAt).toBeInstanceOf(Date)
      }
      expect(store.myPosts[0]!.id).toBe(CUID_NEW)
    })
  })

  describe('fetchPostsInBounds', () => {
    it('parses response into postSummaries state', async () => {
      const fakePosts = [
        {
          id: CUID_1,
          type: 'OFFER',
          content: 'Hello',
          location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
          postedBy: {
            id: CUID_2,
            publicName: 'Alice',
            profileImages: [],
            location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
          },
        },
      ]
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, posts: fakePosts },
      })

      const store = usePostStore()
      const result = await store.fetchPostsInBounds({
        south: 47,
        north: 48,
        west: 18,
        east: 20,
      })

      expect(result.success).toBe(true)
      expect(store.postSummaries).toHaveLength(1)
      expect(store.postSummaries[0]!.id).toBe(CUID_1)
      expect(mockApi.get).toHaveBeenCalledWith('/posts/bounds', {
        params: { south: 47, north: 48, west: 18, east: 20 },
      })
    })

    it('returns error on request failure', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('network'))
      const store = usePostStore()
      const result = await store.fetchPostsInBounds({
        south: 0,
        north: 0,
        west: 0,
        east: 0,
      })
      expect(result.success).toBe(false)
    })
  })
})
