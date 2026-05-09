import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

const mockGet = vi.fn()

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
  safeApiCall: (fn: () => unknown) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

const fetchPostsInBounds = vi.fn().mockResolvedValue({ success: true })
const postSummaries = ref<any[]>([])
vi.mock('@/features/posts/stores/postStore', () => ({
  usePostStore: () => ({ fetchPostsInBounds, postSummaries }),
}))

import { useBrowseViewModel } from '../useBrowseViewModel'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import type { MapBounds } from '@/features/map/types/map.types'

const mockBounds: MapBounds = { south: 46.5, north: 47.5, west: 18.0, east: 19.0 }

describe('useBrowseViewModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    postSummaries.value = []
  })

  it('derives profile POIs from cluster features', () => {
    const store = useFindProfileStore()
    store.clusterFeatures = [
      {
        type: 'point',
        kind: 'profile',
        id: 'p1',
        lat: 47.1,
        lon: 18.6,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
      {
        type: 'cluster',
        id: 1,
        lat: 47.3,
        lon: 18.8,
        count: 5,
        expansionZoom: 8,
      },
    ]

    const vm = useBrowseViewModel()

    expect(vm.profilePois.value).toHaveLength(1)
    expect(vm.profilePois.value[0]!.kind).toBe('profile')
    expect(vm.profilePois.value[0]!.id).toBe('p1')

    expect(vm.clusters.value).toHaveLength(1)
  })

  it('passes hasPost flag from profile features to MapPoi', () => {
    const store = useFindProfileStore()
    store.clusterFeatures = [
      {
        type: 'point',
        kind: 'profile',
        id: 'p1',
        lat: 47.1,
        lon: 18.6,
        publicName: 'Alice',
        image: null,
        highlighted: false,
        hasPost: true,
      },
    ]

    const vm = useBrowseViewModel()
    expect(vm.profilePois.value[0]!.hasPost).toBe(true)
  })

  it('derives post POIs from cluster features', () => {
    const store = useFindProfileStore()
    store.clusterFeatures = [
      {
        type: 'point',
        kind: 'post',
        id: 'post-1',
        lat: 47.2,
        lon: 18.7,
        publicName: 'Bob',
        image: null,
        highlighted: false,
        postContent: 'Cherry harvest',
      },
    ]

    const vm = useBrowseViewModel()

    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.postPois.value[0]!.kind).toBe('post')
    expect(vm.postPois.value[0]!.postContent).toBe('Cherry harvest')
    expect(vm.allPois.value).toHaveLength(1)
  })

  it('populates tags from cluster response', async () => {
    const mockTags = [{ id: 'cltagabc000000000000001', name: 'Biokert', slug: 'biokert' }]
    mockGet.mockResolvedValue({
      data: {
        success: true,
        features: [
          {
            type: 'point',
            kind: 'post',
            id: 'post1',
            lat: 47.1,
            lon: 18.6,
            publicName: 'Author',
            image: null,
            highlighted: false,
            postContent: 'Has loc',
            postType: 'OFFER',
          },
        ],
        tags: mockTags,
      },
    })

    const store = useFindProfileStore()
    await store.findClustersForMapBounds(mockBounds, 10)

    const vm = useBrowseViewModel()
    expect(vm.availableTags.value).toHaveLength(1)
    expect(vm.availableTags.value[0]!.name).toBe('Biokert')
  })

  it('excludes cluster features from POI lists', () => {
    const store = useFindProfileStore()
    store.clusterFeatures = [
      {
        type: 'cluster',
        id: 1,
        lat: 47.5,
        lon: 19.0,
        count: 10,
        expansionZoom: 6,
      },
    ]

    const vm = useBrowseViewModel()
    expect(vm.profilePois.value).toHaveLength(0)
    expect(vm.postPois.value).toHaveLength(0)
    expect(vm.allPois.value).toHaveLength(0)
  })

  describe('onBoundsChanged', () => {
    it('fetches cluster features and bounds posts in parallel', async () => {
      const store = useFindProfileStore()
      const fetchBoundsSpy = vi.spyOn(store, 'fetchBounds').mockResolvedValue()

      const { onBoundsChanged } = useBrowseViewModel()
      await onBoundsChanged({
        bounds: { south: 47, north: 48, west: 18, east: 20 },
        zoom: 7,
      })

      expect(fetchBoundsSpy).toHaveBeenCalledWith({ south: 47, north: 48, west: 18, east: 20 }, 7)
      expect(fetchPostsInBounds).toHaveBeenCalledWith({
        south: 47,
        north: 48,
        west: 18,
        east: 20,
      })
    })
  })
})
