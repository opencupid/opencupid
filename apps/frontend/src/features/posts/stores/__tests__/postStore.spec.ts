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

const mockUserContentStore = vi.hoisted(() => ({
  upsert: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => mockUserContentStore,
}))

import { usePostStore } from '../postStore'

const CUID_1 = 'cmc7t45x400086w39gj30pzn3'
const CUID_2 = 'cmc7t45x400086w39gj30pzn4'

const basePost = {
  kind: 'post' as const,
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

  describe('createPost', () => {
    it('mirrors the created post into useUserContentStore', async () => {
      const store = usePostStore()
      const created = makeOwnerPost(CUID_1)
      mockApi.post.mockResolvedValue({ data: { success: true, post: created } })

      const result = await store.createPost({ content: 'test', type: 'OFFER' } as any)

      expect(result.success).toBe(true)
      expect(mockApi.post).toHaveBeenCalledWith('/content/posts', {
        content: 'test',
        type: 'OFFER',
      })
      expect(mockUserContentStore.upsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('updatePost', () => {
    it('updates currentPost when ids match and mirrors into userContentStore', async () => {
      const store = usePostStore()
      const updated = makeOwnerPost(CUID_1, { content: 'updated' })
      store.currentPost = makeOwnerPost(CUID_1) as any
      mockApi.patch.mockResolvedValue({ data: { success: true, post: updated } })

      const result = await store.updatePost(CUID_1, { content: 'updated' } as any)

      expect(result.success).toBe(true)
      expect(store.currentPost?.content).toBe('updated')
      expect(mockUserContentStore.upsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('deletePost', () => {
    it('removes from userContentStore and clears currentPost when ids match', async () => {
      const store = usePostStore()
      store.currentPost = makeOwnerPost(CUID_1) as any
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deletePost(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.delete).toHaveBeenCalledWith(`/content/posts/${CUID_1}`)
      expect(store.currentPost).toBeNull()
      expect(mockUserContentStore.remove).toHaveBeenCalledWith(CUID_1)
    })

    it('returns storeError on failure', async () => {
      const store = usePostStore()
      mockApi.delete.mockRejectedValue(new Error('network error'))

      const result = await store.deletePost(CUID_1)

      expect(result.success).toBe(false)
    })
  })

  describe('hidePost / showPost', () => {
    it('hidePost patches isVisible:false and mirrors into userContentStore', async () => {
      const store = usePostStore()
      const hidden = makeOwnerPost(CUID_1, { isVisible: false })
      mockApi.patch.mockResolvedValue({ data: { success: true, post: hidden } })

      const result = await store.hidePost(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.patch).toHaveBeenCalledWith(`/content/posts/${CUID_1}`, { isVisible: false })
      expect(mockUserContentStore.upsert).toHaveBeenCalledTimes(1)
    })

    it('showPost patches isVisible:true', async () => {
      const store = usePostStore()
      const visible = makeOwnerPost(CUID_1, { isVisible: true })
      mockApi.patch.mockResolvedValue({ data: { success: true, post: visible } })

      const result = await store.showPost(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.patch).toHaveBeenCalledWith(`/content/posts/${CUID_1}`, { isVisible: true })
    })
  })

  describe('fetchPostsInBounds', () => {
    it('populates postSummaries on success', async () => {
      const store = usePostStore()
      const summaries = [
        {
          id: CUID_1,
          kind: 'post',
          type: 'OFFER',
          content: 'a',
          location: { country: 'US' },
          postedBy: profileSummary,
        },
        {
          id: CUID_2,
          kind: 'post',
          type: 'REQUEST',
          content: 'b',
          location: { country: 'US' },
          postedBy: profileSummary,
        },
      ]
      mockApi.get.mockResolvedValue({ data: { success: true, posts: summaries } })

      const result = await store.fetchPostsInBounds({
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      } as any)

      expect(result.success).toBe(true)
      expect(store.postSummaries.map((p) => p.id)).toEqual([CUID_1, CUID_2])
    })

    it('returns error on request failure', async () => {
      const store = usePostStore()
      mockApi.get.mockRejectedValue(new Error('network error'))

      const result = await store.fetchPostsInBounds({
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      } as any)

      expect(result.success).toBe(false)
    })
  })
})
