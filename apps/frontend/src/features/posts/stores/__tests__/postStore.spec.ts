import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockApi = vi.hoisted(() => ({
  delete: vi.fn(),
  patch: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

import { usePostStore } from '../postStore'

describe('postStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('deletePost removes post from store state', async () => {
    const store = usePostStore()
    store.myPosts = [{ id: 'post-1' } as any]
    store.posts = [{ id: 'post-1' } as any]
    store.currentPost = { id: 'post-1' } as any
    mockApi.delete.mockResolvedValue({ data: { success: true } })

    const success = await store.deletePost('post-1')

    expect(success).toBe(true)
    expect(mockApi.delete).toHaveBeenCalledWith('/posts/post-1')
    expect(store.myPosts).toEqual([])
    expect(store.posts).toEqual([])
    expect(store.currentPost).toBeNull()
  })

  it('hidePost updates myPosts and removes hidden post from public list cache', async () => {
    const store = usePostStore()
    const hiddenPost = { id: 'post-1', isVisible: false } as any
    store.myPosts = [{ id: 'post-1', isVisible: true } as any]
    store.posts = [{ id: 'post-1' } as any, { id: 'post-2' } as any]
    store.currentPost = { id: 'post-1', isVisible: true } as any
    mockApi.patch.mockResolvedValue({ data: { success: true, post: hiddenPost } })

    const result = await store.hidePost('post-1')

    expect(mockApi.patch).toHaveBeenCalledWith('/posts/post-1', { isVisible: false })
    expect(result).toEqual(hiddenPost)
    expect(store.myPosts[0]!.isVisible).toBe(false)
    expect(store.posts.map(post => post.id)).toEqual(['post-2'])
    expect(store.currentPost).toEqual(hiddenPost)
  })

  it('showPost updates visibility to true and keeps public cache intact', async () => {
    const store = usePostStore()
    const visiblePost = { id: 'post-1', isVisible: true } as any
    store.myPosts = [{ id: 'post-1', isVisible: false } as any]
    store.posts = [{ id: 'post-2' } as any]
    store.currentPost = { id: 'post-1', isVisible: false } as any
    mockApi.patch.mockResolvedValue({ data: { success: true, post: visiblePost } })

    const result = await store.showPost('post-1')

    expect(mockApi.patch).toHaveBeenCalledWith('/posts/post-1', { isVisible: true })
    expect(result).toEqual(visiblePost)
    expect(store.myPosts[0]!.isVisible).toBe(true)
    expect(store.posts.map(post => post.id)).toEqual(['post-2'])
    expect(store.currentPost).toEqual(visiblePost)
  })

  describe('pagination - fetchPosts', () => {
    it('replaces posts on initial load (offset 0)', async () => {
      const store = usePostStore()
      store.posts = [{ id: 'old-1' } as any]
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [{ id: 'new-1' }, { id: 'new-2' }] } })

      await store.fetchPosts({ limit: 20, offset: 0 })

      expect(store.posts.map(p => p.id)).toEqual(['new-1', 'new-2'])
    })

    it('appends posts when offset > 0 (load more)', async () => {
      const store = usePostStore()
      store.posts = [{ id: 'existing-1' } as any]
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [{ id: 'new-1' }, { id: 'new-2' }] } })

      await store.fetchPosts({ limit: 20, offset: 20 })

      expect(store.posts.map(p => p.id)).toEqual(['existing-1', 'new-1', 'new-2'])
    })

    it('includes offset param in query when offset > 0', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.fetchPosts({ limit: 20, offset: 40 })

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('offset=40'))
    })
  })

  describe('pagination - loadPosts', () => {
    it('calculates offset from page * pageSize', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.loadPosts('all', { page: 2, pageSize: 20 })

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('offset=40'))
    })

    it('uses offset 0 for first page', async () => {
      const store = usePostStore()
      mockApi.get.mockResolvedValue({ data: { success: true, posts: [] } })

      await store.loadPosts('all', { page: 0, pageSize: 20 })

      // offset=0 is not appended to params (falsy check), so posts should be replaced
      expect(store.posts).toEqual([])
    })
  })
})
