import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { post, delete: del } = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { post, delete: del },
  safeApiCall: async (fn: () => Promise<unknown>) => fn(),
}))

vi.mock('@/lib/utils', () => ({
  urlBase64ToUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
}))

const mockUpdateOptInSettings = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    updateOptInSettings: mockUpdateOptInSettings,
  }),
}))

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
}))

import { usePushNotificationStore } from '../pushNotificationStore'

describe('pushNotificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    post.mockReset()
    del.mockReset()
    mockUpdateOptInSettings.mockClear()
    vi.stubGlobal('__APP_CONFIG__', {
      NODE_ENV: 'production',
      VAPID_PUBLIC_KEY: 'test-key',
    })
  })

  describe('checkSubscription', () => {
    it('sets isSubscribed to false when permission is not granted', async () => {
      vi.stubGlobal('Notification', { permission: 'denied' })
      vi.stubGlobal('navigator', {
        serviceWorker: { ready: Promise.resolve() },
      })
      ;(window as any).PushManager = {}

      const store = usePushNotificationStore()
      await store.checkSubscription()
      expect(store.isSubscribed).toBe(false)
    })

    it('sets isSubscribed to true when subscription exists', async () => {
      vi.stubGlobal('Notification', { permission: 'granted' })
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com' }),
            },
          }),
        },
      })
      ;(window as any).PushManager = {}

      const store = usePushNotificationStore()
      await store.checkSubscription()
      expect(store.isSubscribed).toBe(true)
    })
  })

  describe('subscribe', () => {
    it('requests permission, subscribes, posts to API, and syncs DB flag', async () => {
      const mockSubscription = { endpoint: 'https://push.example.com' }
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      })
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              subscribe: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
      })
      ;(window as any).PushManager = {}
      post.mockResolvedValue({})

      const store = usePushNotificationStore()
      const res = await store.subscribe()

      expect(Notification.requestPermission).toHaveBeenCalled()
      expect(post).toHaveBeenCalledWith('/push/subscription', mockSubscription)
      expect(mockUpdateOptInSettings).toHaveBeenCalledWith({ isPushNotificationEnabled: true })
      expect(store.isSubscribed).toBe(true)
      expect(res.success).toBe(true)
    })

    it('returns error when permission denied', async () => {
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      })
      vi.stubGlobal('navigator', {
        serviceWorker: { ready: Promise.resolve() },
      })
      ;(window as any).PushManager = {}

      const store = usePushNotificationStore()
      const res = await store.subscribe()

      expect(res.success).toBe(false)
      expect(store.isSubscribed).toBe(false)
    })
  })

  describe('unsubscribe', () => {
    it('unsubscribes, deletes from API, and syncs DB flag', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true)
      vi.stubGlobal('Notification', { permission: 'granted' })
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({
                endpoint: 'https://push.example.com',
                unsubscribe: mockUnsubscribe,
              }),
            },
          }),
        },
      })
      ;(window as any).PushManager = {}
      del.mockResolvedValue({})

      const store = usePushNotificationStore()
      const res = await store.unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
      expect(del).toHaveBeenCalledWith('/push/subscription', {
        data: { endpoint: 'https://push.example.com' },
      })
      expect(mockUpdateOptInSettings).toHaveBeenCalledWith({ isPushNotificationEnabled: false })
      expect(store.isSubscribed).toBe(false)
      expect(res.success).toBe(true)
    })
  })
})
