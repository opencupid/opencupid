import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

const { mockTracker, mockBus } = vi.hoisted(() => {
  const mockTracker = {
    start: vi.fn(),
    setUserID: vi.fn(),
    setMetadata: vi.fn(),
  }
  return {
    mockTracker,
    mockBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
  }
})

vi.mock('@/lib/bus', () => ({
  bus: mockBus,
}))

vi.mock('@openreplay/tracker', () => ({
  default: class {
    start = mockTracker.start
    setUserID = mockTracker.setUserID
    setMetadata = mockTracker.setMetadata
  },
}))

const mockAuthStore = { userId: null as string | null }
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.stubGlobal('__APP_CONFIG__', {
  OPENREPLAY_PROJECT_KEY: 'test-key',
  OPENREPLAY_INGEST_POINT: 'https://ingest.example.com',
  NODE_ENV: 'production',
})
afterAll(() => vi.unstubAllGlobals())

// Capture module-level bus.on handlers before tests clear mocks
const busHandlers = new Map<string, (...args: unknown[]) => void>()
function captureBusHandlers() {
  for (const [event, handler] of mockBus.on.mock.calls) {
    busHandlers.set(event as string, handler as (...args: unknown[]) => void)
  }
}

describe('openreplayStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStore.userId = null
  })

  async function loadStore() {
    const { useOpenreplayStore } = await import('../openreplayStore')
    if (busHandlers.size === 0) captureBusHandlers()
    return useOpenreplayStore()
  }

  describe('enabled watcher', () => {
    it('starts tracker when enabled is set to true', async () => {
      mockAuthStore.userId = 'user-123'
      const store = await loadStore()

      store.enabled = true
      await nextTick()

      await vi.waitFor(() => expect(mockTracker.start).toHaveBeenCalled())
      expect(mockTracker.setMetadata).toHaveBeenCalledWith('environment', 'production')
      expect(mockTracker.setUserID).toHaveBeenCalledWith('user-123')
      expect(store.tracker).not.toBeNull()
    })

    it('tears down tracker when enabled is set to false', async () => {
      mockAuthStore.userId = 'user-123'
      const store = await loadStore()

      store.enabled = true
      await nextTick()
      await vi.waitFor(() => expect(store.tracker).not.toBeNull())
      vi.clearAllMocks()

      store.enabled = false
      await nextTick()

      expect(mockTracker.setUserID).toHaveBeenCalledWith('')
      expect(store.tracker).toBeNull()
    })

    it('skips start when userId is null', async () => {
      mockAuthStore.userId = null
      const store = await loadStore()

      store.enabled = true
      await nextTick()
      await Promise.resolve()

      expect(mockTracker.start).not.toHaveBeenCalled()
      expect(store.tracker).toBeNull()
    })

    it('skips start when config keys are missing', async () => {
      vi.stubGlobal('__APP_CONFIG__', {
        OPENREPLAY_PROJECT_KEY: '',
        OPENREPLAY_INGEST_POINT: '',
        NODE_ENV: 'production',
      })
      mockAuthStore.userId = 'user-123'
      const store = await loadStore()

      store.enabled = true
      await nextTick()
      await Promise.resolve()

      expect(mockTracker.start).not.toHaveBeenCalled()
      expect(store.tracker).toBeNull()

      vi.stubGlobal('__APP_CONFIG__', {
        OPENREPLAY_PROJECT_KEY: 'test-key',
        OPENREPLAY_INGEST_POINT: 'https://ingest.example.com',
        NODE_ENV: 'production',
      })
    })
  })

  describe('auth:logout bus listener', () => {
    it('sets enabled to false and tears down on logout', async () => {
      mockAuthStore.userId = 'user-789'
      const store = await loadStore()

      store.enabled = true
      await nextTick()
      await vi.waitFor(() => expect(store.tracker).not.toBeNull())
      vi.clearAllMocks()

      const logoutHandler = busHandlers.get('auth:logout')!
      expect(logoutHandler).toBeDefined()
      logoutHandler()

      await nextTick()
      expect(store.enabled).toBe(false)
      expect(mockTracker.setUserID).toHaveBeenCalledWith('')
      expect(store.tracker).toBeNull()
    })
  })
})
