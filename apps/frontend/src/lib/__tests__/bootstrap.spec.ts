import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import Cookies from 'universal-cookie'
import { SESSION_COOKIE } from '@shared/session'

// --- hoisted mocks ---
const { mockFetchOwnerProfile, mockConnectWebSocket, mockMessagingInit, mockInteractionInit } =
  vi.hoisted(() => ({
    mockFetchOwnerProfile: vi.fn().mockResolvedValue({ success: true }),
    mockConnectWebSocket: vi.fn(),
    mockMessagingInit: vi.fn(),
    mockInteractionInit: vi.fn(),
  }))

vi.mock('@/lib/websocket', () => ({ connectWebSocket: mockConnectWebSocket }))

vi.mock('@/features/browse/stores/findProfileStore', () => ({
  useFindProfileStore: vi.fn(),
}))

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({ fetchOwnerProfile: mockFetchOwnerProfile }),
}))

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({ initialize: mockMessagingInit }),
}))

vi.mock('@/features/interaction/stores/useInteractionStore', () => ({
  useInteractionStore: () => ({ initialize: mockInteractionInit }),
}))

vi.mock('@/store/localStore', () => ({
  useLocalStore: () => ({ initialize: vi.fn() }),
}))

vi.stubGlobal('__APP_CONFIG__', { NODE_ENV: 'test' })

import { useBootstrap } from '../bootstrap'

describe('useBootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    new Cookies().remove(SESSION_COOKIE, { path: '/' })
    vi.clearAllMocks()
  })

  describe('cold start — no session cookie', () => {
    it('does not fetch profile when no token is present', async () => {
      await useBootstrap().bootstrap()

      expect(mockFetchOwnerProfile).not.toHaveBeenCalled()
      expect(mockConnectWebSocket).not.toHaveBeenCalled()
    })
  })

  describe('cold start — session cookie present', () => {
    it('fetches owner profile when session cookie exists', async () => {
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })

      await useBootstrap().bootstrap()

      expect(mockFetchOwnerProfile).toHaveBeenCalledOnce()
    })

    it('connects websocket and initializes services after profile fetch', async () => {
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })

      await useBootstrap().bootstrap()

      expect(mockConnectWebSocket).toHaveBeenCalledOnce()
      expect(mockMessagingInit).toHaveBeenCalledOnce()
      expect(mockInteractionInit).toHaveBeenCalledOnce()
    })

    it('is idempotent — second call reuses the same promise', async () => {
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })
      const bs = useBootstrap()

      await Promise.all([bs.bootstrap(), bs.bootstrap()])

      expect(mockFetchOwnerProfile).toHaveBeenCalledOnce()
    })
  })

  describe('onLogin — hot start after magic link verification', () => {
    it('resets and re-runs bootstrap so profile is fetched fresh', async () => {
      // Simulate a prior cold-start where user was not logged in (no token)
      await useBootstrap().bootstrap()
      expect(mockFetchOwnerProfile).not.toHaveBeenCalled()

      // Now user logs in — session cookie is set by the backend
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })
      await useBootstrap().onLogin()

      expect(mockFetchOwnerProfile).toHaveBeenCalledOnce()
    })

    it('profile is loaded before onLogin resolves', async () => {
      let profileFetched = false
      mockFetchOwnerProfile.mockImplementation(async () => {
        profileFetched = true
        return { success: true }
      })
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })

      await useBootstrap().onLogin()

      // onLogin is awaited — by the time it resolves, profile must be fetched
      expect(profileFetched).toBe(true)
    })

    it('allows re-bootstrap after onLogin resets the promise', async () => {
      new Cookies().set(SESSION_COOKIE, 'some.jwt.token', { path: '/', sameSite: 'strict' })
      const bs = useBootstrap()

      await bs.bootstrap()
      expect(mockFetchOwnerProfile).toHaveBeenCalledTimes(1)

      await bs.onLogin()
      expect(mockFetchOwnerProfile).toHaveBeenCalledTimes(2)
    })
  })
})
