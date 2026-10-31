import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { CanceledError } from 'axios'

const { mockGet, busHandlers } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  busHandlers: {} as Record<string, () => void>,
}))
vi.mock('@/lib/api', () => ({
  api: { get: mockGet },
  safeApiCall: (fn: () => any) => fn(),
}))
vi.mock('@/lib/bus', () => ({
  bus: {
    on: (event: string, handler: () => void) => {
      busHandlers[event] = handler
    },
    emit: vi.fn(),
  },
}))

import { useBrowseGridStore, type BrowseGridQuery } from '../browseGridStore'

const query: BrowseGridQuery = {
  bounds: { south: 47, north: 48, west: 18.5, east: 19.5 },
  tagIds: ['tag-b', 'tag-a'],
  kinds: ['profile', 'post'],
}

const profileItem = (id: string, distanceKm = 1) => ({
  kind: 'profile',
  distanceKm,
  profile: {
    id: `cprofile${id}0000000000`,
    publicName: id,
    languages: ['hu'],
    profileImages: [],
    tags: [],
    location: { country: 'HU', cityName: 'Szentendre', lat: 47.6, lon: 19.0 },
    isDatingActive: false,
  },
})

const page = (ids: string[], total: number, hasMore: boolean) => ({
  data: { success: true, total, hasMore, items: ids.map((id) => profileItem(id)) },
})

describe('browseGridStore', () => {
  let store: ReturnType<typeof useBrowseGridStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBrowseGridStore()
    vi.clearAllMocks()
  })

  it('loads the first page with the bounds and filters as query params', async () => {
    mockGet.mockResolvedValue(page(['a', 'b'], 30, true))

    const res = await store.load(query)

    expect(res.success).toBe(true)
    expect(mockGet).toHaveBeenCalledWith('/find/list', {
      params: {
        south: 47,
        north: 48,
        west: 18.5,
        east: 19.5,
        tagIds: 'tag-b,tag-a',
        kinds: 'profile,post',
        limit: 24,
        offset: 0,
      },
      signal: expect.any(AbortSignal),
    })
    expect(store.items.map((i) => i.kind)).toEqual(['profile', 'profile'])
    expect(store.total).toBe(30)
    expect(store.hasMore).toBe(true)
    expect(store.isLoading).toBe(false)
  })

  it('leaves out tagIds when no tags are selected', async () => {
    mockGet.mockResolvedValue(page([], 0, false))

    await store.load({ ...query, tagIds: [] })

    expect(mockGet.mock.calls[0]![1].params.tagIds).toBeUndefined()
  })

  it('does not refetch for the same query, even with filters in another order', async () => {
    mockGet.mockResolvedValue(page(['a'], 1, false))

    await store.load(query)
    await store.load({ ...query, tagIds: ['tag-a', 'tag-b'], kinds: ['post', 'profile'] })

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetches from the first page when the bounds change', async () => {
    mockGet
      .mockResolvedValueOnce(page(['a'], 1, false))
      .mockResolvedValueOnce(page(['z'], 1, false))

    await store.load(query)
    await store.load({ ...query, bounds: { ...query.bounds, north: 48.5 } })

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(store.items).toHaveLength(1)
    expect((store.items[0] as any).profile.publicName).toBe('z')
  })

  it('appends the next page on loadMore', async () => {
    mockGet
      .mockResolvedValueOnce(page(['a', 'b'], 3, true))
      .mockResolvedValueOnce(page(['c'], 3, false))

    await store.load(query)
    await store.loadMore()

    expect(mockGet.mock.calls[1]![1].params.offset).toBe(2)
    expect(store.items.map((i: any) => i.profile.publicName)).toEqual(['a', 'b', 'c'])
    expect(store.hasMore).toBe(false)
  })

  it('does nothing on loadMore when there are no more pages', async () => {
    mockGet.mockResolvedValue(page(['a'], 1, false))

    await store.load(query)
    await store.loadMore()

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('returns an error and allows a retry when the request fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page(['a'], 1, false))

    const res = await store.load(query)
    expect(res.success).toBe(false)
    expect(store.isLoading).toBe(false)

    await store.load(query)
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(store.items).toHaveLength(1)
  })

  it('treats a cancelled request as success', async () => {
    mockGet.mockRejectedValue(new CanceledError())

    const res = await store.load(query)

    expect(res.success).toBe(true)
  })

  it('reloads the current query when the map data changes', async () => {
    mockGet.mockResolvedValue(page(['a'], 1, false))
    await store.load(query)

    busHandlers['usercontent:mutated']!()
    await Promise.resolve()

    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('clears everything on logout', async () => {
    mockGet.mockResolvedValue(page(['a'], 1, false))
    await store.load(query)

    busHandlers['auth:logout']!()

    expect(store.items).toEqual([])
    expect(store.total).toBe(0)
  })
})
