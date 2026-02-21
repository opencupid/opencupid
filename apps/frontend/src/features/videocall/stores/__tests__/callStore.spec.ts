import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockCallsApi = vi.hoisted(() => ({
  initiateCall: vi.fn(),
  acceptCall: vi.fn(),
  declineCall: vi.fn(),
  cancelCall: vi.fn(),
  updateCallable: vi.fn(),
}))

const mockBus = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: mockBus,
}))

vi.mock('../../api/calls.api', () => mockCallsApi)

import { useCallStore } from '../callStore'

describe('callStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initiateCall', () => {
    it('sets status to calling and stores roomName', async () => {
      const store = useCallStore()
      mockCallsApi.initiateCall.mockResolvedValue({
        data: { roomName: 'room-123', conversationId: 'c1' },
      })

      await store.initiateCall('c1')

      expect(store.status).toBe('calling')
      expect(store.roomName).toBe('room-123')
      expect(store.conversationId).toBe('c1')
    })

    it('auto-cancels after 30s timeout', async () => {
      const store = useCallStore()
      mockCallsApi.initiateCall.mockResolvedValue({
        data: { roomName: 'room-123', conversationId: 'c1' },
      })
      mockCallsApi.cancelCall.mockResolvedValue({})

      await store.initiateCall('c1')
      expect(store.status).toBe('calling')

      vi.advanceTimersByTime(30_000)
      await vi.runAllTimersAsync()

      expect(mockCallsApi.cancelCall).toHaveBeenCalledWith('c1')
      expect(store.status).toBe('idle')
    })

    it('does nothing when not idle', async () => {
      const store = useCallStore()
      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })

      await store.initiateCall('c2')
      expect(mockCallsApi.initiateCall).not.toHaveBeenCalled()
    })
  })

  describe('handleIncomingCall', () => {
    it('sets status to ringing with caller info', () => {
      const store = useCallStore()
      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })

      expect(store.status).toBe('ringing')
      expect(store.callerInfo?.publicName).toBe('Alice')
      expect(store.roomName).toBe('room-1')
    })

    it('ignores incoming call when not idle', () => {
      const store = useCallStore()
      // Already ringing
      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })
      // Second call arrives
      store.handleIncomingCall({
        conversationId: 'c2',
        roomName: 'room-2',
        caller: { id: 'p2', publicName: 'Bob' },
      })

      expect(store.conversationId).toBe('c1')
    })
  })

  describe('acceptCall', () => {
    it('sets status to active on accept', async () => {
      const store = useCallStore()
      mockCallsApi.acceptCall.mockResolvedValue({})

      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })

      await store.acceptCall()
      expect(store.status).toBe('active')
      expect(mockCallsApi.acceptCall).toHaveBeenCalledWith('c1')
    })
  })

  describe('declineCall', () => {
    it('resets state on decline', async () => {
      const store = useCallStore()
      mockCallsApi.declineCall.mockResolvedValue({})

      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })

      await store.declineCall()
      expect(store.status).toBe('idle')
      expect(mockCallsApi.declineCall).toHaveBeenCalledWith('c1')
    })
  })

  describe('handleCallAccepted', () => {
    it('transitions calling to active', async () => {
      const store = useCallStore()
      mockCallsApi.initiateCall.mockResolvedValue({
        data: { roomName: 'room-123', conversationId: 'c1' },
      })

      await store.initiateCall('c1')

      store.handleCallAccepted({ conversationId: 'c1', roomName: 'room-123' })
      expect(store.status).toBe('active')
    })
  })

  describe('handleCallDeclined', () => {
    it('resets from calling state', async () => {
      const store = useCallStore()
      mockCallsApi.initiateCall.mockResolvedValue({
        data: { roomName: 'room-123', conversationId: 'c1' },
      })

      await store.initiateCall('c1')

      store.handleCallDeclined({ conversationId: 'c1' })
      expect(store.status).toBe('idle')
    })
  })

  describe('handleCallCancelled', () => {
    it('resets from ringing state', () => {
      const store = useCallStore()
      store.handleIncomingCall({
        conversationId: 'c1',
        roomName: 'room-1',
        caller: { id: 'p1', publicName: 'Alice' },
      })

      store.handleCallCancelled({ conversationId: 'c1' })
      expect(store.status).toBe('idle')
    })
  })

  describe('initialize / teardown', () => {
    it('registers bus listeners on initialize', () => {
      const store = useCallStore()
      store.initialize()

      expect(mockBus.on).toHaveBeenCalledWith('ws:incoming_call', expect.any(Function))
      expect(mockBus.on).toHaveBeenCalledWith('ws:call_accepted', expect.any(Function))
      expect(mockBus.on).toHaveBeenCalledWith('ws:call_declined', expect.any(Function))
      expect(mockBus.on).toHaveBeenCalledWith('ws:call_cancelled', expect.any(Function))
    })

    it('unregisters bus listeners on teardown', () => {
      const store = useCallStore()
      store.initialize()
      store.teardown()

      expect(mockBus.off).toHaveBeenCalledWith('ws:incoming_call', expect.any(Function))
      expect(mockBus.off).toHaveBeenCalledWith('ws:call_accepted', expect.any(Function))
      expect(mockBus.off).toHaveBeenCalledWith('ws:call_declined', expect.any(Function))
      expect(mockBus.off).toHaveBeenCalledWith('ws:call_cancelled', expect.any(Function))
    })
  })
})
