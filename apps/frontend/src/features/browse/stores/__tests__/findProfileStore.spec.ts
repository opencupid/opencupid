import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api: { get: mockGet },
  safeApiCall: (fn: () => any) => fn(),
  isApiOnline: () => Promise.resolve(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), emit: vi.fn() },
}))

import { useFindProfileStore } from '../findProfileStore'

describe('findProfileStore.refetchBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('re-fetches POIs when lastMapBounds is set', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })
    store.lastMapBounds = bounds

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith(
      '/find/bounds',
      expect.objectContaining({
        params: expect.objectContaining({
          south: expect.any(Number),
          north: expect.any(Number),
          west: expect.any(Number),
          east: expect.any(Number),
        }),
      })
    )
  })

  it('does nothing when lastMapBounds is null', async () => {
    await store.refetchBounds()

    expect(mockGet).not.toHaveBeenCalled()
  })
})

describe('findPoisForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches POIs and tags from the bounds endpoint', async () => {
    const mockFeatures = [
      {
        type: 'point',
        kind: 'profile',
        id: 'p1',
        lat: 48.2,
        lon: 16.3,
        publicName: 'Alice',
        image: null,
        highlighted: false,
      },
      {
        type: 'point',
        kind: 'post',
        id: 'post1',
        lat: 47.5,
        lon: 19.0,
        publicName: 'Bob',
        image: null,
        highlighted: false,
        postContent: 'Hello',
      },
    ]
    const mockTags = [{ id: 'cltagabc000000000000001', name: 'Biokert', slug: 'biokert' }]
    mockGet.mockResolvedValue({ data: { success: true, features: mockFeatures, tags: mockTags } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }
    await store.findPoisForMapBounds(bounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/bounds',
      expect.objectContaining({
        params: expect.objectContaining({
          south: expect.any(Number),
          north: expect.any(Number),
          west: expect.any(Number),
          east: expect.any(Number),
        }),
      })
    )
    // Zoom is no longer part of the bounds request — the spreading happens
    // client-side at render time.
    const params = mockGet.mock.calls[0]![1].params
    expect(params.zoom).toBeUndefined()
    expect(store.poiFeatures).toHaveLength(2)
    expect(store.availableTags).toHaveLength(1)
    expect(store.availableTags[0]!.name).toBe('Biokert')
  })

  it('reuses cached bounds for an enclosed viewport', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    const outer = { south: 47, north: 49, west: 16, east: 20 }
    const inner = { south: 47.3, north: 48.8, west: 16.3, east: 19.7 }

    await store.findPoisForMapBounds(outer)
    expect(mockGet).toHaveBeenCalledTimes(1)

    // Inner is contained in the padded outer → no refetch.
    await store.findPoisForMapBounds(inner)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('cancels in-flight request on new call', async () => {
    let resolveFirst: (v: any) => void
    const firstCall = new Promise((r) => {
      resolveFirst = r
    })
    mockGet.mockImplementationOnce(() => firstCall)
    mockGet.mockResolvedValueOnce({ data: { success: true, features: [], tags: [] } })

    const bounds = { south: 47, north: 49, west: 16, east: 20 }

    const p1 = store.findPoisForMapBounds(bounds)
    const p2 = store.findPoisForMapBounds(bounds)

    resolveFirst!({ data: { success: true, features: [], tags: [] } })
    await Promise.all([p1, p2])

    expect(store.poiFeatures).toEqual([])
  })
})

describe('fetchProfileForPopup', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches a single profile by ID', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    const result = await store.fetchProfileForPopup('p1')

    expect(mockGet).toHaveBeenCalledWith('/profiles/p1', expect.objectContaining({}))
    expect(result).toEqual(mockProfile)
  })

  it('caches repeated fetches for the same profile', async () => {
    const mockProfile = { id: 'p1', publicName: 'Alice' }
    mockGet.mockResolvedValue({ data: { success: true, profile: mockProfile } })

    await store.fetchProfileForPopup('p1')
    await store.fetchProfileForPopup('p1')

    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})

describe('findPoisForMapBounds with layer kinds', () => {
  let store: ReturnType<typeof useFindProfileStore>
  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('sends all enabled layers as comma-separated kinds param by default', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findPoisForMapBounds(bounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/bounds',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile,post,event,community' }),
      })
    )
  })

  it('sends kinds=post when only Posts is selected', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    store.selectedLayers = ['post']

    await store.findPoisForMapBounds(bounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/bounds',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'post' }),
      })
    )
  })

  it('skips network when same kinds + same viewport are already cached', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findPoisForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)

    await store.findPoisForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetches when kinds changes even with the same viewport', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findPoisForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)

    store.selectedLayers = ['profile']

    await store.findPoisForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith(
      '/find/bounds',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile' }),
      })
    )
  })
})
