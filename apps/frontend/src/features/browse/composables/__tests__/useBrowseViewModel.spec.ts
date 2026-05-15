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

const fetchFeedInBounds = vi.fn().mockResolvedValue({ success: true })
const feedItems = ref<any[]>([])
vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({ fetchFeedInBounds, feedItems }),
}))

import { useBrowseViewModel } from '../useBrowseViewModel'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import type { MapBounds } from '@/features/map/types/map.types'

const mockBounds: MapBounds = { south: 46.5, north: 47.5, west: 18.0, east: 19.0 }

describe('useBrowseViewModel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    feedItems.value = []
  })

  it('derives profile POIs from bounds features', () => {
    const store = useFindProfileStore()
    store.poiFeatures = [
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
    ]

    const vm = useBrowseViewModel()

    expect(vm.profilePois.value).toHaveLength(1)
    expect(vm.profilePois.value[0]!.kind).toBe('profile')
    expect(vm.profilePois.value[0]!.id).toBe('p1')
  })

  it('passes hasPost flag from profile features to MapPoi', () => {
    const store = useFindProfileStore()
    store.poiFeatures = [
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

  it('derives post POIs from bounds features', () => {
    const store = useFindProfileStore()
    store.poiFeatures = [
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

  it('derives community POIs from bounds features and includes them in allPois', () => {
    const store = useFindProfileStore()
    store.poiFeatures = [
      {
        type: 'point',
        kind: 'community',
        id: 'community-1',
        lat: 46.87,
        lon: 17.68,
        publicName: 'Hannah',
        image: null,
        highlighted: false,
      },
    ]

    const vm = useBrowseViewModel()

    expect(vm.communityPois.value).toHaveLength(1)
    expect(vm.communityPois.value[0]!.kind).toBe('community')
    expect(vm.communityPois.value[0]!.id).toBe('community-1')
    expect(vm.allPois.value).toHaveLength(1)
    expect(vm.allPois.value[0]!.kind).toBe('community')
  })

  it('populates tags from bounds response', async () => {
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
          },
        ],
        tags: mockTags,
      },
    })

    const store = useFindProfileStore()
    await store.findPoisForMapBounds(mockBounds)

    const vm = useBrowseViewModel()
    expect(vm.availableTags.value).toHaveLength(1)
    expect(vm.availableTags.value[0]!.name).toBe('Biokert')
  })

  describe('onBoundsChanged', () => {
    it('fetches bounds features and feed posts in parallel', async () => {
      const store = useFindProfileStore()
      const fetchBoundsSpy = vi.spyOn(store, 'fetchBounds').mockResolvedValue()

      const { onBoundsChanged } = useBrowseViewModel()
      await onBoundsChanged({
        bounds: { south: 47, north: 48, west: 18, east: 20 },
        zoom: 7,
      })

      expect(fetchBoundsSpy).toHaveBeenCalledWith({ south: 47, north: 48, west: 18, east: 20 }, 7)
      expect(fetchFeedInBounds).toHaveBeenCalledWith({
        south: 47,
        north: 48,
        west: 18,
        east: 20,
      })
    })
  })
})
