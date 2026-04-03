import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
  safeApiCall: (fn: () => unknown) => fn(),
}))

import { ref } from 'vue'
import { useBrowseViewModel } from '../useBrowseViewModel'
import type { MapBounds } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

const mockBounds: MapBounds = { south: 46.5, north: 47.5, west: 18.0, east: 19.0 }
const noCluster = ref([])

describe('useBrowseViewModel', () => {
  beforeEach(() => {
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

    const vm = useBrowseViewModel(noCluster)
    await vm.fetchPostsAndTags(mockBounds)

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

    const vm = useBrowseViewModel(noCluster)
    await vm.fetchPostsAndTags(mockBounds)

    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.postPois.value[0]!.id).toBe('post1')
  })

  it('toggleTag adds and removes tag IDs', () => {
    const vm = useBrowseViewModel(noCluster)
    expect(vm.selectedTagIds.value).toEqual([])

    vm.toggleTag('t1')
    expect(vm.selectedTagIds.value).toEqual(['t1'])

    vm.toggleTag('t2')
    expect(vm.selectedTagIds.value).toEqual(['t1', 't2'])

    vm.toggleTag('t1')
    expect(vm.selectedTagIds.value).toEqual(['t2'])
  })

  it('clearTags resets selectedTagIds', () => {
    const vm = useBrowseViewModel(noCluster)
    vm.toggleTag('t1')
    vm.toggleTag('t2')
    vm.clearTags()
    expect(vm.selectedTagIds.value).toEqual([])
  })
})
