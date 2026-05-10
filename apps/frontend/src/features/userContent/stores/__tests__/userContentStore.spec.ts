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

import { useUserContentStore } from '../userContentStore'

const CUID_1 = 'cmc7t45x400086w39gj30pzn3'
const CUID_2 = 'cmc7t45x400086w39gj30pzn4'

const profileSummary = {
  id: CUID_1,
  publicName: 'Test',
  profileImages: [],
  location: { country: '' },
}

const baseScalars = {
  content: 'test',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  postedById: CUID_1,
  country: null,
  cityName: null,
  lat: null,
  lon: null,
}

function makeOwnerPost(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...baseScalars,
    id,
    kind: 'post' as const,
    type: 'OFFER',
    postedBy: profileSummary,
    isDeleted: false,
    isVisible: true,
    isOwn: true,
    ...overrides,
  }
}

function makeOwnerEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...baseScalars,
    id,
    kind: 'event' as const,
    startsAt: '2026-06-01T18:00:00Z',
    venue: null,
    postedBy: profileSummary,
    isDeleted: false,
    isVisible: true,
    isOwn: true,
    ...overrides,
  }
}

describe('useUserContentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchMyContent', () => {
    it('replaces myContent on initial load (offset 0)', async () => {
      const store = useUserContentStore()
      mockApi.get.mockResolvedValue({
        data: { success: true, items: [makeOwnerPost(CUID_1), makeOwnerEvent(CUID_2)] },
      })

      const result = await store.fetchMyContent({ limit: 20, offset: 0 })

      expect(result.success).toBe(true)
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_1, CUID_2])
      expect(store.isInitialized).toBe(true)
    })

    it('appends on subsequent pages', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any]
      mockApi.get.mockResolvedValue({
        data: { success: true, items: [makeOwnerEvent(CUID_2)] },
      })

      await store.fetchMyContent({ limit: 20, offset: 20 })

      expect(store.myContent.map((c) => c.id)).toEqual([CUID_1, CUID_2])
    })
  })

  describe('myPosts / myEvents getters', () => {
    it('partitions myContent by kind', () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any, makeOwnerEvent(CUID_2) as any]
      expect(store.myPosts.map((c) => c.id)).toEqual([CUID_1])
      expect(store.myEvents.map((c) => c.id)).toEqual([CUID_2])
    })
  })

  describe('upsert / remove', () => {
    it('upsert inserts a new item at the front when id is unknown', () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any]
      store.upsert(makeOwnerEvent(CUID_2) as any)
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_2, CUID_1])
    })

    it('upsert replaces in place when id exists', () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any]
      store.upsert(makeOwnerPost(CUID_1, { content: 'updated' }) as any)
      expect(store.myContent).toHaveLength(1)
      expect(store.myContent[0]!.content).toBe('updated')
    })

    it('remove drops the matching item', () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any, makeOwnerEvent(CUID_2) as any]
      store.remove(CUID_1)
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_2])
    })
  })

  describe('post CRUD mirrors into myContent', () => {
    it('createPost upserts the returned post', async () => {
      const store = useUserContentStore()
      const created = makeOwnerPost(CUID_1)
      mockApi.post.mockResolvedValue({ data: { success: true, post: created } })

      const result = await store.createPost({ content: 'test', type: 'OFFER' } as any)

      expect(result.success).toBe(true)
      expect(mockApi.post).toHaveBeenCalledWith('/content/posts', {
        content: 'test',
        type: 'OFFER',
      })
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_1])
    })

    it('updatePost replaces the existing post in myContent', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any]
      const updated = makeOwnerPost(CUID_1, { content: 'updated' })
      mockApi.patch.mockResolvedValue({ data: { success: true, post: updated } })

      const result = await store.updatePost(CUID_1, { content: 'updated' } as any)

      expect(result.success).toBe(true)
      expect(store.myContent[0]!.content).toBe('updated')
    })

    it('deletePost removes from myContent', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1) as any]
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deletePost(CUID_1)

      expect(result.success).toBe(true)
      expect(store.myContent).toEqual([])
    })

    it('hidePost / showPost toggle isVisible via setPostVisibility', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1, { isVisible: true }) as any]
      mockApi.patch.mockResolvedValue({
        data: { success: true, post: makeOwnerPost(CUID_1, { isVisible: false }) },
      })

      await store.hidePost(CUID_1)

      expect(mockApi.patch).toHaveBeenCalledWith(`/content/posts/${CUID_1}`, { isVisible: false })
      expect((store.myContent[0] as any).isVisible).toBe(false)
    })
  })

  describe('event CRUD mirrors into myContent', () => {
    it('createEvent upserts the returned event', async () => {
      const store = useUserContentStore()
      const created = makeOwnerEvent(CUID_1)
      mockApi.post.mockResolvedValue({ data: { success: true, event: created } })

      const result = await store.createEvent({
        content: 'test',
        startsAt: new Date('2026-06-01T18:00:00Z'),
      } as any)

      expect(result.success).toBe(true)
      expect(mockApi.post).toHaveBeenCalledWith('/content/events', expect.any(Object))
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_1])
    })

    it('deleteEvent removes from myContent', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerEvent(CUID_1) as any]
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deleteEvent(CUID_1)

      expect(result.success).toBe(true)
      expect(store.myContent).toEqual([])
    })
  })

  describe('fetchPostsInBounds', () => {
    it('populates postSummaries on success', async () => {
      const store = useUserContentStore()
      const summaries = [
        {
          id: CUID_1,
          kind: 'post',
          type: 'OFFER',
          content: 'a',
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
      expect(store.postSummaries.map((p) => p.id)).toEqual([CUID_1])
    })
  })
})
