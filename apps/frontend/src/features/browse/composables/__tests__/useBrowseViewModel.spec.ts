import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
  safeApiCall: (fn: () => unknown) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useBrowseViewModel } from '../useBrowseViewModel'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import type { MapBounds } from '@/features/map/types/map.types'

const mockBounds: MapBounds = { south: 46.5, north: 47.5, west: 18.0, east: 19.0 }

describe('useBrowseViewModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches posts and tags on bounds change', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        profiles: [],
        posts: [
          {
            id: 'post1',
            content: 'Cherry harvest',
            location: { lat: 47.1, lon: 18.6, country: 'HU', cityName: 'Bp' },
            postedBy: { id: 'p1', publicName: 'Mónika', profileImages: [] },
          },
        ],
        tags: [{ id: 't1', name: 'Biokert', slug: 'biokert' }],
      },
    })

    const vm = useBrowseViewModel(vi.fn())
    const store = useFindProfileStore()
    await store.fetchPostsAndTags(mockBounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/browse/bounds',
      expect.objectContaining({ params: mockBounds })
    )
    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.postPois.value[0]!.type).toBe('post')
    expect(vm.availableTags.value).toHaveLength(1)
  })

  it('filters out posts without location', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        profiles: [],
        posts: [
          {
            id: 'post1',
            content: 'Has loc',
            location: { lat: 47, lon: 18, country: 'HU' },
            postedBy: null,
          },
          { id: 'post2', content: 'No loc', location: null, postedBy: null },
        ],
        tags: [],
      },
    })

    const store = useFindProfileStore()
    await store.fetchPostsAndTags(mockBounds)

    const vm = useBrowseViewModel(vi.fn())
    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.postPois.value[0]!.id).toBe('post1')
  })
})
