import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

import { useUnsubscribeStore } from '../unsubscribeStore'

beforeEach(() => {
  setActivePinia(createPinia())
  mockApi.get.mockReset()
  mockApi.post.mockReset()
})

describe('useUnsubscribeStore.getStatus', () => {
  it('URL-encodes the token and returns parsed status', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { success: true, alreadyUnsubscribed: false },
    })
    const store = useUnsubscribeStore()

    const res = await store.getStatus('a.b.c+/=')

    expect(mockApi.get).toHaveBeenCalledWith('/unsubscribe/a.b.c%2B%2F%3D')
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data?.alreadyUnsubscribed).toBe(false)
    }
  })

  it('reports alreadyUnsubscribed when the API says so', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { success: true, alreadyUnsubscribed: true },
    })
    const store = useUnsubscribeStore()

    const res = await store.getStatus('tok')

    expect(res.success).toBe(true)
    if (res.success) expect(res.data?.alreadyUnsubscribed).toBe(true)
  })

  it('returns a StoreError when the API rejects', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('boom'))
    const store = useUnsubscribeStore()

    const res = await store.getStatus('tok')

    expect(res.success).toBe(false)
  })

  it('returns a StoreError on schema mismatch', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { unexpected: 'shape' } })
    const store = useUnsubscribeStore()

    const res = await store.getStatus('tok')

    expect(res.success).toBe(false)
  })
})

describe('useUnsubscribeStore.unsubscribe', () => {
  it('POSTs to the unsubscribe endpoint and returns parsed status', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, alreadyUnsubscribed: false },
    })
    const store = useUnsubscribeStore()

    const res = await store.unsubscribe('tok')

    expect(mockApi.post).toHaveBeenCalledWith('/unsubscribe/tok')
    expect(res.success).toBe(true)
  })

  it('returns a StoreError when the API rejects', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('nope'))
    const store = useUnsubscribeStore()

    const res = await store.unsubscribe('tok')

    expect(res.success).toBe(false)
  })
})
