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

describe('findProfileStore.findSocialForMapBounds', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    vi.clearAllMocks()
  })

  const bounds = { south: 45, north: 48, west: 16, east: 23 }
  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU' },
    profileImages: [],
    tags: [],
  }

  it('calls the bounded map endpoint with bounds params', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    await store.findProfilesForMapBounds(bounds)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/social/map/bounds',
      expect.objectContaining({
        params: { south: 45, north: 48, west: 16, east: 23 },
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
})
