import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

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

  describe('initialize', () => {
    it('registers openreplay:start bus listener', async () => {
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registered = (mockBus.on.mock.calls as any[]).some(
        ([event]: [string]) => event === 'openreplay:start'
      )
      expect(registered).toBe(true)
    })

    it('openreplay:start handler calls start when userId is set', async () => {
      mockAuthStore.userId = 'user-123'
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void

      startHandler()
      // start() is async — flush the microtask queue
      await vi.waitFor(() => expect(mockTracker.start).toHaveBeenCalled())
      expect(mockTracker.setUserID).toHaveBeenCalledWith('user-123')
    })

    it('openreplay:start handler skips start when userId is null', async () => {
      mockAuthStore.userId = null
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void

      startHandler()
      // Give async start() a chance to run (it shouldn't)
      await Promise.resolve()

      expect(mockTracker.start).not.toHaveBeenCalled()
      expect(store.tracker).toBeNull()
    })
  })

  describe('start', () => {
    it('creates tracker with correct config, metadata, and userId', async () => {
      const store = await loadStore()
      // Access internal start via the store's exposed actions — not directly exported,
      // so we test it through the bus handler path above and verify state here
      // by triggering initialize + openreplay:start
      mockAuthStore.userId = 'user-456'
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void

      startHandler()
      await vi.waitFor(() => expect(store.tracker).not.toBeNull())

      expect(mockTracker.start).toHaveBeenCalled()
      expect(mockTracker.setMetadata).toHaveBeenCalledWith('environment', 'production')
      expect(mockTracker.setUserID).toHaveBeenCalledWith('user-456')
    })

    it('skips when config keys are missing', async () => {
      vi.stubGlobal('__APP_CONFIG__', {
        OPENREPLAY_PROJECT_KEY: '',
        OPENREPLAY_INGEST_POINT: '',
        NODE_ENV: 'production',
      })
      mockAuthStore.userId = 'user-123'
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void

      startHandler()
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

  describe('teardown', () => {
    it('clears tracker identity and nulls the instance', async () => {
      mockAuthStore.userId = 'user-789'
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void
      startHandler()
      await vi.waitFor(() => expect(store.tracker).not.toBeNull())
      vi.clearAllMocks()

      store.teardown()

      expect(mockTracker.setUserID).toHaveBeenCalledWith('')
      expect(store.tracker).toBeNull()
    })
  })

  describe('auth:logout bus listener', () => {
    it('calls teardown on logout', async () => {
      mockAuthStore.userId = 'user-789'
      const store = await loadStore()
      store.initialize()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandler = (mockBus.on.mock.calls as any[]).find(
        ([event]: [string]) => event === 'openreplay:start'
      )?.[1] as () => void
      startHandler()
      await vi.waitFor(() => expect(store.tracker).not.toBeNull())
      vi.clearAllMocks()

      const logoutHandler = busHandlers.get('auth:logout')!
      expect(logoutHandler).toBeDefined()
      logoutHandler()

      expect(mockTracker.setUserID).toHaveBeenCalledWith('')
      expect(store.tracker).toBeNull()
    })
  })
})
