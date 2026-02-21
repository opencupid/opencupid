import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('../api/calls.api', () => ({
  initiateCall: vi.fn().mockResolvedValue({ data: { roomName: 'r1', conversationId: 'c1' } }),
  acceptCall: vi.fn(),
  declineCall: vi.fn(),
  cancelCall: vi.fn().mockResolvedValue({}),
  updateCallable: vi.fn(),
}))

import { useCallStore } from '../stores/callStore'

describe('CallingOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('store starts with idle status', () => {
    const store = useCallStore()
    expect(store.status).toBe('idle')
  })

  it('transitions to calling on initiateCall', async () => {
    const store = useCallStore()
    await store.initiateCall('c1')
    expect(store.status).toBe('calling')
  })

  it('resets to idle on cancelCall', async () => {
    const store = useCallStore()
    await store.initiateCall('c1')
    await store.cancelCall()
    expect(store.status).toBe('idle')
  })
})
