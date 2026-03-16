import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../userStore'

const { mockApi, mockSafeApiCall, mockBus } = vi.hoisted(() => {
  return {
    mockApi: {
      get: vi.fn(),
      patch: vi.fn(),
      defaults: { headers: { common: {} as Record<string, string> } },
    },
    mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
    mockBus: { emit: vi.fn(), on: vi.fn() },
  }
})

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
}))

vi.mock('@/lib/bus', () => ({
  bus: mockBus,
}))

const mockAuthState = { isLoggedIn: false }
vi.mock('@/features/auth/stores/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthState),
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
})
afterAll(() => vi.unstubAllGlobals())

const validUser = {
  email: 'test@example.com',
  phonenumber: '',
  language: 'en',
  newsletterOptIn: false,
  isPushNotificationEnabled: false,
}

describe('userStore', () => {
  // Bus handlers are registered at module load time, capture before clearAllMocks
  const busHandlers = new Map<string, (payload: Record<string, unknown>) => Promise<void>>()
  function captureBusHandlers() {
    for (const [event, handler] of mockBus.on.mock.calls) {
      busHandlers.set(
        event as string,
        handler as (payload: Record<string, unknown>) => Promise<void>
      )
    }
  }
  captureBusHandlers()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthState.isLoggedIn = false
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  describe('fetchUser', () => {
    it('calls GET /users/me and stores parsed result', async () => {
      mockApi.get.mockResolvedValue({ data: { user: validUser } })

      const store = useUserStore()
      const result = await store.fetchUser()

      expect(mockApi.get).toHaveBeenCalledWith('/users/me')
      expect(result.success).toBe(true)
      expect(result.success && result.data).toEqual(validUser)
      expect(store.user).toEqual(validUser)
    })

    it('returns error on invalid user data', async () => {
      mockApi.get.mockResolvedValue({ data: { user: { invalid: true } } })

      const store = useUserStore()
      const result = await store.fetchUser()

      expect(result.success).toBe(false)
      expect(store.user).toBeNull()
    })

    it('returns error on API failure', async () => {
      mockSafeApiCall.mockRejectedValue(new Error('Network error'))

      const store = useUserStore()
      const result = await store.fetchUser()

      expect(result.success).toBe(false)
      expect(store.user).toBeNull()
    })

    it('sets isLoading during fetch', async () => {
      let resolveApi: (value: unknown) => void
      mockApi.get.mockReturnValue(
        new Promise((resolve) => {
          resolveApi = resolve
        })
      )

      const store = useUserStore()
      const fetchPromise = store.fetchUser()

      expect(store.isLoading).toBe(true)

      resolveApi!({ data: { user: validUser } })
      await fetchPromise

      expect(store.isLoading).toBe(false)
    })
  })

  describe('updateLanguage', () => {
    it('calls PATCH /users/me with language', async () => {
      mockApi.patch.mockResolvedValue({ data: { success: true } })

      const store = useUserStore()
      store.user = { ...validUser }
      const result = await store.updateLanguage('de')

      expect(mockApi.patch).toHaveBeenCalledWith('/users/me', { language: 'de' })
      expect(result.success).toBe(true)
      expect(store.user!.language).toBe('de')
    })

    it('returns error on failure', async () => {
      mockSafeApiCall.mockRejectedValue(new Error('Failed'))

      const store = useUserStore()
      const result = await store.updateLanguage('de')

      expect(result.success).toBe(false)
    })
  })

  describe('language:changed bus listener', () => {
    it('skips PATCH when user data has not been loaded yet', async () => {
      mockAuthState.isLoggedIn = true
      const handler = busHandlers.get('language:changed')!

      const store = useUserStore()
      expect(store.user).toBeNull()

      await handler({ language: 'en' })

      expect(mockApi.patch).not.toHaveBeenCalled()
    })

    it('skips PATCH when language already matches user language', async () => {
      mockAuthState.isLoggedIn = true
      const handler = busHandlers.get('language:changed')!

      const store = useUserStore()
      store.user = { ...validUser, language: 'en' }

      await handler({ language: 'en' })

      expect(mockApi.patch).not.toHaveBeenCalled()
    })

    it('sends PATCH when language differs from user language', async () => {
      mockAuthState.isLoggedIn = true
      mockApi.patch.mockResolvedValue({ data: { success: true } })
      const handler = busHandlers.get('language:changed')!

      const store = useUserStore()
      store.user = { ...validUser, language: 'en' }

      await handler({ language: 'de' })

      expect(mockApi.patch).toHaveBeenCalledWith('/users/me', { language: 'de' })
    })

    it('skips PATCH when user is not logged in', async () => {
      mockAuthState.isLoggedIn = false
      const handler = busHandlers.get('language:changed')!

      await handler({ language: 'de' })

      expect(mockApi.patch).not.toHaveBeenCalled()
    })
  })
})
