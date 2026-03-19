import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { CanceledError } from 'axios'

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

describe('findProfileStore.findProfilesForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  const bounds = { south: 45, north: 48, west: 16, east: 23 }
  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }

  it('calls the bounded map endpoint with padded bounds params', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    await store.findProfilesForMapBounds(bounds)

    const expectedPadded = {
      south: bounds.south - (bounds.north - bounds.south) * 0.3,
      north: bounds.north + (bounds.north - bounds.south) * 0.3,
      west: bounds.west - (bounds.east - bounds.west) * 0.3,
      east: bounds.east + (bounds.east - bounds.west) * 0.3,
    }
    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/bounds',
      expect.objectContaining({
        params: expectedPadded,
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('updates profileList with fetched results', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    await store.findProfilesForMapBounds(bounds)

    expect(store.profileList).toHaveLength(1)
    expect(store.profileList[0]!.id).toBe(mockProfile.id)
  })

  it('sets isLoading during fetch', async () => {
    let resolveGet: any
    mockGet.mockReturnValue(new Promise((r) => (resolveGet = r)))

    const promise = store.findProfilesForMapBounds(bounds)
    expect(store.isLoading).toBe(true)

    resolveGet({ data: { profiles: [] } })
    await promise
    expect(store.isLoading).toBe(false)
  })

  it('aborts previous request when a new one starts', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    let resolveFirst: any
    mockGet.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))

    const first = store.findProfilesForMapBounds(bounds)
    // Clear any abort calls from the first invocation (cleaning up stale controller from prior tests)
    abortSpy.mockClear()

    mockGet.mockResolvedValueOnce({ data: { profiles: [] } })
    const second = store.findProfilesForMapBounds(bounds)

    expect(abortSpy).toHaveBeenCalledTimes(1)

    resolveFirst({ data: { profiles: [] } })
    await Promise.allSettled([first, second])

    abortSpy.mockRestore()
  })

  it('silently ignores CanceledError from aborted requests', async () => {
    mockGet.mockRejectedValueOnce(new CanceledError('canceled'))

    const result = await store.findProfilesForMapBounds(bounds)

    expect(result.success).toBe(true)
    expect(store.profileList).toEqual([])
  })

  it('returns error for non-cancel failures', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const result = await store.findProfilesForMapBounds(bounds)

    expect(result.success).toBe(false)
  })

  it('stores lastMapBounds for later re-fetch', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [] } })

    expect(store.lastMapBounds).toBeNull()
    await store.findProfilesForMapBounds(bounds)
    expect(store.lastMapBounds).toEqual(bounds)
  })
})

describe('findProfileStore.refetchBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('fetches match IDs and re-fetches map when lastMapBounds is set', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [], ids: ['p1'] } })
    store.lastMapBounds = bounds

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/dating/match-ids')
    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/bounds',
      expect.objectContaining({
        params: {
          south: bounds.south - (bounds.north - bounds.south) * 0.3,
          north: bounds.north + (bounds.north - bounds.south) * 0.3,
          west: bounds.west - (bounds.east - bounds.west) * 0.3,
          east: bounds.east + (bounds.east - bounds.west) * 0.3,
        },
      })
    )
  })

  it('fetches match IDs only when lastMapBounds is null', async () => {
    mockGet.mockResolvedValue({ data: { ids: [] } })

    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/dating/match-ids')
    expect(mockGet).not.toHaveBeenCalledWith('/find/social/map/bounds', expect.anything())
  })
})

describe('findProfileStore bounds caching', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }

  it('skips API call when requested bounds are within cached bounds', async () => {
    mockGet.mockResolvedValueOnce({ data: { profiles: [mockProfile] } })

    const largeBounds = { south: 40, north: 50, west: 10, east: 30 }
    await store.findProfilesForMapBounds(largeBounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
    mockGet.mockClear()

    const smallBounds = { south: 44, north: 48, west: 14, east: 24 }
    await store.findProfilesForMapBounds(smallBounds)
    expect(mockGet).not.toHaveBeenCalled()
    expect(store.profileList).toHaveLength(1)
  })

  it('fetches from API when bounds extend beyond cached area', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    const bounds1 = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds1)
    mockGet.mockClear()

    const bounds2 = { south: 35, north: 40, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds2)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on teardown', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    store.teardown()

    mockGet.mockResolvedValue({ data: { profiles: [] } })
    await store.findProfilesForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on refetchBounds', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile], ids: [] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    mockGet.mockResolvedValue({ data: { profiles: [], ids: [] } })
    store.lastMapBounds = bounds
    await store.refetchBounds()

    expect(mockGet).toHaveBeenCalledWith('/find/social/map/bounds', expect.anything())
  })
})
