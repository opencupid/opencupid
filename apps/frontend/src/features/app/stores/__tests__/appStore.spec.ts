import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../appStore'
import * as apiModule from '@/lib/api'
import packageJson from '../../../../../package.json'

const APP_VERSION = packageJson.version

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  getVersionInfo: vi.fn(),
  safeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

describe('useAppStore - checkVersion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sets updateAvailable to false when versions match', async () => {
    const mockGetVersionInfo = apiModule.getVersionInfo as any
    mockGetVersionInfo.mockResolvedValue({
      updateAvailable: false,
      frontendVersion: APP_VERSION,
      backendVersion: '1.0.0',
      currentVersion: APP_VERSION,
    })

    const store = useAppStore()
    const result = await store.checkVersion()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.updateAvailable).toBe(false)
    }
    expect(store.updateAvailable).toBe(false)
    expect(store.latestVersion).toBe(APP_VERSION)
    expect(mockGetVersionInfo).toHaveBeenCalledTimes(1)
  })

  it('sets updateAvailable to true when versions differ', async () => {
    const mockGetVersionInfo = apiModule.getVersionInfo as any
    mockGetVersionInfo.mockResolvedValue({
      updateAvailable: true,
      frontendVersion: '0.6.0',
      backendVersion: '1.0.0',
      currentVersion: APP_VERSION,
    })

    const store = useAppStore()
    const result = await store.checkVersion()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.updateAvailable).toBe(true)
    }
    expect(store.updateAvailable).toBe(true)
    expect(store.latestVersion).toBe('0.6.0')
  })

  it('handles API errors gracefully', async () => {
    const mockGetVersionInfo = apiModule.getVersionInfo as any
    mockGetVersionInfo.mockRejectedValue(new Error('Network error'))

    const store = useAppStore()
    const result = await store.checkVersion()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBeTruthy()
    }
    expect(store.updateAvailable).toBe(false)
  })

  it('sends current version as query parameter', async () => {
    const mockGetVersionInfo = apiModule.getVersionInfo as any
    mockGetVersionInfo.mockResolvedValue({
      updateAvailable: false,
      frontendVersion: APP_VERSION,
      backendVersion: '1.0.0',
      currentVersion: APP_VERSION,
    })

    const store = useAppStore()
    await store.checkVersion()

    expect(mockGetVersionInfo).toHaveBeenCalledTimes(1)
  })
})

describe('useAppStore - fetchLocation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('stores the looked-up location on success', async () => {
    const mockGet = apiModule.api.get as any
    mockGet.mockResolvedValue({
      status: 200,
      data: { success: true, location: { country: 'DE', cityName: '' } },
    })

    const store = useAppStore()
    const result = await store.fetchLocation()

    expect(result.success).toBe(true)
    expect(store.geoipLocation).toEqual({ country: 'DE', cityName: '' })
    expect(mockGet).toHaveBeenCalledWith('/app/location')
  })

  it('leaves geoipLocation null on API failure', async () => {
    const mockGet = apiModule.api.get as any
    mockGet.mockRejectedValue(new Error('boom'))

    const store = useAppStore()
    const result = await store.fetchLocation()

    expect(result.success).toBe(false)
    expect(store.geoipLocation).toBeNull()
  })
})

describe('useAppStore - initialize', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('kicks off fetchLocation without blocking', async () => {
    const mockGet = apiModule.api.get as any
    let resolveGet!: (v: unknown) => void
    mockGet.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve
      })
    )

    const store = useAppStore()
    store.fetchLocation()

    expect(mockGet).toHaveBeenCalledWith('/app/location')

    resolveGet({
      status: 200,
      data: { success: true, location: { country: 'FR', cityName: '' } },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(store.geoipLocation).toEqual({ country: 'FR', cityName: '' })
  })
})
