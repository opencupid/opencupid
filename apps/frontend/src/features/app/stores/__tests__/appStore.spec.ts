import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../appStore'
import * as apiModule from '@/lib/api'
import rootPackageJson from '../../../../../../../package.json'

const APP_VERSION = rootPackageJson.version

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('useAppStore - checkVersion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sets updateAvailable to false when versions match', async () => {
    const mockApi = apiModule.api as any
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        version: {
          updateAvailable: false,
          frontendVersion: APP_VERSION,
          currentVersion: APP_VERSION,
        },
      },
    })

    const store = useAppStore()
    const result = await store.checkVersion()

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.updateAvailable).toBe(false)
    }
    expect(store.updateAvailable).toBe(false)
    expect(store.latestVersion).toBe(APP_VERSION)
    expect(mockApi.get).toHaveBeenCalledWith('/app/version', {
      params: { v: APP_VERSION },
    })
  })

  it('sets updateAvailable to true when versions differ', async () => {
    const mockApi = apiModule.api as any
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        version: {
          updateAvailable: true,
          frontendVersion: '0.6.0',
          currentVersion: APP_VERSION,
        },
      },
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
    const mockApi = apiModule.api as any
    mockApi.get.mockRejectedValue(new Error('Network error'))

    const store = useAppStore()
    const result = await store.checkVersion()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBeTruthy()
    }
    expect(store.updateAvailable).toBe(false)
  })

  it('sends current version as query parameter', async () => {
    const mockApi = apiModule.api as any
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        version: {
          updateAvailable: false,
          frontendVersion: APP_VERSION,
          currentVersion: APP_VERSION,
        },
      },
    })

    const store = useAppStore()
    await store.checkVersion()

    expect(mockApi.get).toHaveBeenCalledWith('/app/version', {
      params: { v: APP_VERSION },
    })
  })
})
