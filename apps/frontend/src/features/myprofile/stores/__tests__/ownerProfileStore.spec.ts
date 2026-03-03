import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
}))

const { get, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { get, patch },
  safeApiCall: async (fn: () => Promise<unknown>) => fn(),
  isApiOnline: vi.fn(),
}))

import { useOwnerProfileStore } from '../ownerProfileStore'

describe('ownerProfileStore opt-in settings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    patch.mockReset()
    vi.stubGlobal('__APP_CONFIG__', { NODE_ENV: 'production' })
  })

  it('fetchOptInSettings calls /profiles/me/optin and stores result', async () => {
    get.mockResolvedValue({
      data: {
        optIn: {
          isCallable: false,
          newsletterOptIn: true,
          isPushNotificationEnabled: true,
        },
      },
    })

    const store = useOwnerProfileStore()
    const res = await store.fetchOptInSettings()

    expect(get).toHaveBeenCalledWith('/profiles/me/optin')
    expect(res.success).toBe(true)
    expect(store.optInSettings).toEqual({
      isCallable: false,
      newsletterOptIn: true,
      isPushNotificationEnabled: true,
    })
  })

  it('updateOptInSettings patches /profiles/me/optin and updates state', async () => {
    patch.mockResolvedValue({
      data: {
        optIn: {
          isCallable: true,
          newsletterOptIn: false,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useOwnerProfileStore()
    const res = await store.updateOptInSettings({ isPushNotificationEnabled: false })

    expect(patch).toHaveBeenCalledWith('/profiles/me/optin', {
      isPushNotificationEnabled: false,
    })
    expect(res.success).toBe(true)
    expect(store.optInSettings).toEqual({
      isCallable: true,
      newsletterOptIn: false,
      isPushNotificationEnabled: false,
    })
  })
})
