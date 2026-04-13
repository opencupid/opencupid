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

  it('derives profile and post POIs from cluster features', () => {
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
        type: 'point',
        kind: 'post',
        id: 'post1',
        lat: 47.2,
        lon: 18.7,
        publicName: 'Bob',
        image: null,
        highlighted: false,
        postContent: 'Cherry harvest',
        postType: 'OFFER',
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
    expect(vm.profilePois.value[0]!.type).toBe('profile')
    expect(vm.profilePois.value[0]!.id).toBe('p1')

    expect(vm.postPois.value).toHaveLength(1)
    expect(vm.postPois.value[0]!.type).toBe('post')
    expect(vm.postPois.value[0]!.title).toBe('Cherry harvest')

    expect(vm.allPois.value).toHaveLength(2)
    expect(vm.clusters.value).toHaveLength(1)
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
})
