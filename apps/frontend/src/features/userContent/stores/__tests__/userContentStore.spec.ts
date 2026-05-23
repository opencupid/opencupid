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

import type { MapBounds } from '@/features/map/types/map.types'
import { bus } from '@/lib/bus'
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

function makeOwnerCommunity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...baseScalars,
    id,
    kind: 'community' as const,
    yearFounded: 1998,
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

  describe('myPosts / myEvents / myCommunities getters', () => {
    it('partitions myContent by kind', () => {
      const store = useUserContentStore()
      const CUID_3 = 'cmc7t45x400086w39gj30pzn5'
      store.myContent = [
        makeOwnerPost(CUID_1) as any,
        makeOwnerEvent(CUID_2) as any,
        makeOwnerCommunity(CUID_3) as any,
      ]
      expect(store.myPosts.map((c) => c.id)).toEqual([CUID_1])
      expect(store.myEvents.map((c) => c.id)).toEqual([CUID_2])
      expect(store.myCommunities.map((c) => c.id)).toEqual([CUID_3])
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

  describe('community CRUD mirrors into myContent', () => {
    it('createCommunity posts to /content/communities and upserts the result', async () => {
      const store = useUserContentStore()
      const created = makeOwnerCommunity(CUID_1)
      mockApi.post.mockResolvedValue({ data: { success: true, community: created } })

      const result = await store.createCommunity({
        content: 'a local guild',
        yearFounded: 1998,
      } as any)

      expect(result.success).toBe(true)
      expect(mockApi.post).toHaveBeenCalledWith('/content/communities', {
        content: 'a local guild',
        yearFounded: 1998,
      })
      expect(store.myContent.map((c) => c.id)).toEqual([CUID_1])
    })

    it('updateCommunity patches and replaces the existing item', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerCommunity(CUID_1) as any]
      const updated = makeOwnerCommunity(CUID_1, { content: 'renamed guild' })
      mockApi.patch.mockResolvedValue({ data: { success: true, community: updated } })

      const result = await store.updateCommunity(CUID_1, { content: 'renamed guild' } as any)

      expect(result.success).toBe(true)
      expect(mockApi.patch).toHaveBeenCalledWith(`/content/communities/${CUID_1}`, {
        content: 'renamed guild',
      })
      expect(store.myContent[0]!.content).toBe('renamed guild')
    })

    it('deleteCommunity removes from myContent', async () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerCommunity(CUID_1) as any]
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      const result = await store.deleteCommunity(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.delete).toHaveBeenCalledWith(`/content/communities/${CUID_1}`)
      expect(store.myContent).toEqual([])
    })

    it('fetchPublicCommunity returns the parsed detail without touching myContent', async () => {
      const store = useUserContentStore()
      const detail = {
        ...baseScalars,
        id: CUID_1,
        kind: 'community',
        yearFounded: 1998,
        isOwn: false,
        postedBy: { ...profileSummary, haveConversation: false, canMessage: true },
      }
      mockApi.get.mockResolvedValue({ data: { success: true, community: detail } })

      const result = await store.fetchPublicCommunity(CUID_1)

      expect(result.success).toBe(true)
      expect(mockApi.get).toHaveBeenCalledWith(
        `/content/communities/${CUID_1}`,
        expect.objectContaining({ signal: expect.any(Object) })
      )
      expect(store.myContent).toEqual([])
    })
  })

  describe('fetchFeedInBounds', () => {
    it('populates feedItems on success', async () => {
      const store = useUserContentStore()
      const items = [
        {
          id: CUID_1,
          kind: 'post',
          content: 'a',
          createdAt: new Date('2026-05-13T10:00:00Z').toISOString(),
          isOwn: false,
          postedBy: profileSummary,
          location: { country: 'US' },
        },
        {
          id: 'event-2',
          kind: 'event',
          content: 'b',
          createdAt: new Date('2026-05-13T09:00:00Z').toISOString(),
          isOwn: false,
          postedBy: profileSummary,
          location: { country: 'US' },
        },
      ]
      mockApi.get.mockResolvedValue({ data: { success: true, items } })

      const bounds: MapBounds = { north: 0, south: 0, east: 0, west: 0 }
      const result = await store.fetchFeedInBounds(bounds)

      expect(result.success).toBe(true)
      expect(mockApi.get).toHaveBeenCalledWith('/content/bounds', { params: bounds })
      expect(store.feedItems.map((i) => [i.id, i.kind])).toEqual([
        [CUID_1, 'post'],
        ['event-2', 'event'],
      ])
    })
  })

  describe('RSVP actions', () => {
    it('fetchMyRsvp sets rsvpStatusByEventId to returned status', async () => {
      const store = useUserContentStore()
      mockApi.get.mockResolvedValue({ data: { success: true, status: 'GOING' } })

      await store.fetchMyRsvp(CUID_1)

      expect(mockApi.get).toHaveBeenCalledWith(`/content/events/${CUID_1}/rsvp`)
      expect(store.rsvpStatusByEventId[CUID_1]).toBe('GOING')
    })

    it('fetchMyRsvp sets status to null when API returns null', async () => {
      const store = useUserContentStore()
      mockApi.get.mockResolvedValue({ data: { success: true, status: null } })

      await store.fetchMyRsvp(CUID_1)

      expect(store.rsvpStatusByEventId[CUID_1]).toBeNull()
    })

    it('rsvpEvent sets state optimistically and persists on success', async () => {
      const store = useUserContentStore()
      mockApi.post.mockResolvedValue({ data: { success: true } })

      await store.rsvpEvent(CUID_1, 'GOING')

      expect(store.rsvpStatusByEventId[CUID_1]).toBe('GOING')
      expect(mockApi.post).toHaveBeenCalledWith(`/content/events/${CUID_1}/rsvp`, {
        status: 'GOING',
      })
    })

    it('rsvpEvent rolls back state on API error', async () => {
      const store = useUserContentStore()
      store.rsvpStatusByEventId[CUID_1] = null
      mockApi.post.mockRejectedValue(new Error('network error'))

      await store.rsvpEvent(CUID_1, 'GOING')

      expect(store.rsvpStatusByEventId[CUID_1]).toBeNull()
    })

    it('cancelRsvp sets state to null optimistically and persists on success', async () => {
      const store = useUserContentStore()
      store.rsvpStatusByEventId[CUID_1] = 'GOING'
      mockApi.delete.mockResolvedValue({ data: { success: true } })

      await store.cancelRsvp(CUID_1)

      expect(store.rsvpStatusByEventId[CUID_1]).toBeNull()
      expect(mockApi.delete).toHaveBeenCalledWith(`/content/events/${CUID_1}/rsvp`)
    })

    it('cancelRsvp rolls back on API error', async () => {
      const store = useUserContentStore()
      store.rsvpStatusByEventId[CUID_1] = 'GOING'
      mockApi.delete.mockRejectedValue(new Error('network error'))

      await store.cancelRsvp(CUID_1)

      expect(store.rsvpStatusByEventId[CUID_1]).toBe('GOING')
    })
  })

  describe('auth:logout', () => {
    it('resets store state when auth:logout is emitted', () => {
      const store = useUserContentStore()
      store.myContent = [makeOwnerPost(CUID_1)] as any
      store.feedItems = [{ id: CUID_2 }] as any
      store.isInitialized = true
      store.isLoading = true

      bus.emit('auth:logout')

      expect(store.myContent).toEqual([])
      expect(store.feedItems).toEqual([])
      expect(store.isInitialized).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchAttendees', () => {
    const attendees = [
      {
        profile: { id: CUID_1, publicName: 'Alice', profileImages: [], location: { country: '' } },
        status: 'GOING',
        rsvpedAt: '2030-01-01T00:00:00Z',
      },
      {
        profile: { id: CUID_2, publicName: 'Bob', profileImages: [], location: { country: '' } },
        status: 'MAYBE',
        rsvpedAt: '2030-01-02T00:00:00Z',
      },
    ]

    it('populates attendeesByEventId from API response', async () => {
      const store = useUserContentStore()
      mockApi.get.mockResolvedValue({ data: { success: true, attendees } })

      await store.fetchAttendees(CUID_1)

      expect(mockApi.get).toHaveBeenCalledWith(`/content/events/${CUID_1}/attendees`)
      expect(store.attendeesByEventId[CUID_1]).toHaveLength(2)
      expect(store.attendeesByEventId[CUID_1]![0]!.profile.publicName).toBe('Alice')
      expect(store.attendeesByEventId[CUID_1]![1]!.profile.publicName).toBe('Bob')
    })

    it('leaves state untouched on API error', async () => {
      const store = useUserContentStore()
      mockApi.get.mockRejectedValue(new Error('network error'))

      await store.fetchAttendees(CUID_1)

      expect(store.attendeesByEventId[CUID_1]).toBeUndefined()
    })
  })

  describe('rsvpEvent refetches attendees on success', () => {
    it('triggers fetchAttendees after successful rsvp', async () => {
      const store = useUserContentStore()
      mockApi.post.mockResolvedValue({ data: { success: true } })
      mockApi.get.mockResolvedValue({ data: { success: true, attendees: [] } })

      await store.rsvpEvent(CUID_1, 'GOING')
      // Allow the fire-and-forget fetchAttendees to resolve
      await Promise.resolve()

      expect(mockApi.get).toHaveBeenCalledWith(`/content/events/${CUID_1}/attendees`)
    })

    it('does NOT refetch on rsvp error', async () => {
      const store = useUserContentStore()
      mockApi.post.mockRejectedValue(new Error('network error'))

      await store.rsvpEvent(CUID_1, 'GOING')

      expect(mockApi.get).not.toHaveBeenCalledWith(`/content/events/${CUID_1}/attendees`)
    })
  })

  describe('cancelRsvp refetches attendees on success', () => {
    it('triggers fetchAttendees after successful cancel', async () => {
      const store = useUserContentStore()
      store.rsvpStatusByEventId[CUID_1] = 'GOING'
      mockApi.delete.mockResolvedValue({ data: { success: true } })
      mockApi.get.mockResolvedValue({ data: { success: true, attendees: [] } })

      await store.cancelRsvp(CUID_1)
      await Promise.resolve()

      expect(mockApi.get).toHaveBeenCalledWith(`/content/events/${CUID_1}/attendees`)
    })

    it('does NOT refetch on cancel error', async () => {
      const store = useUserContentStore()
      store.rsvpStatusByEventId[CUID_1] = 'GOING'
      mockApi.delete.mockRejectedValue(new Error('network error'))

      await store.cancelRsvp(CUID_1)

      expect(mockApi.get).not.toHaveBeenCalledWith(`/content/events/${CUID_1}/attendees`)
    })
  })
})
