import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'

const { mockApi, mockSafeApiCall } = vi.hoisted(() => {
  return {
    mockApi: {
      get: vi.fn(),
      post: vi.fn(),
      defaults: { headers: { common: {} as Record<string, string> } },
    },
    mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
  }
})

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
  axios: { isAxiosError: vi.fn(() => false) },
}))

vi.mock('@/lib/bus', () => {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>()
  return {
    bus: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers.has(event)) handlers.set(event, [])
        handlers.get(event)!.push(handler)
      }),
      emit: vi.fn((event: string, ...args: unknown[]) => {
        handlers.get(event)?.forEach((h) => h(...args))
      }),
    },
  }
})

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ onLogin: vi.fn().mockResolvedValue(undefined) }),
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
})
afterAll(() => vi.unstubAllGlobals())

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

describe('authStore initialize', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
  })

  it('clears expired JWT without refresh token on initialize', async () => {
    const expiredToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) - 3600,
    })
    localStorage.setItem('token', expiredToken)

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(false)
    expect(store.isInitialized).toBe(true)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('keeps expired JWT with refresh token on initialize', async () => {
    const expiredToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) - 3600,
    })
    localStorage.setItem('token', expiredToken)
    localStorage.setItem('refreshToken', 'some-refresh-token')

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(true)
    expect(store.isInitialized).toBe(true)
    expect(localStorage.getItem('token')).toBe(expiredToken)
  })

  it('keeps valid JWT on initialize', async () => {
    const validToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    localStorage.setItem('token', validToken)

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(true)
    expect(store.isInitialized).toBe(true)
    expect(store.userId).toBe('u1')
  })

  it('refreshes media token on initialize when a session exists', () => {
    const validToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    localStorage.setItem('token', validToken)
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })

    const store = useAuthStore()
    store.initialize()

    expect(mockApi.post).toHaveBeenCalledWith('/auth/media-token')
  })

  it('does not refresh media token on initialize when no session exists', () => {
    const store = useAuthStore()
    store.initialize()

    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('clears malformed JWT on initialize', async () => {
    localStorage.setItem('token', 'not-a-valid-jwt')

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(false)
    expect(store.isInitialized).toBe(true)
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('authStore localStorage auth flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  it('saves authId in localStorage after sendMagicLink success (email)', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        user: {
          id: 'ck1234567890abcd12345678',
          email: 'test@example.com',
          phonenumber: '',
          language: 'en',
          newsletterOptIn: true,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useAuthStore()
    const res = await store.sendMagicLink({ email: 'test@example.com', phonenumber: '' })

    expect(res.success).toBe(true)
    expect(localStorage.getItem('authId')).toBe('test@example.com')
  })

  it('stores loginUser after sendMagicLink and clears it after verifyToken', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        user: {
          id: 'ck1234567890abcd12345678',
          email: 'test@example.com',
          phonenumber: '',
          language: 'en',
          newsletterOptIn: true,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useAuthStore()
    expect(store.loginUser).toBeNull()
    expect(store.isPhoneAuth).toBe(false)

    await store.sendMagicLink({ email: 'test@example.com', phonenumber: '' })

    expect(store.loginUser).toEqual({
      id: 'ck1234567890abcd12345678',
      email: 'test@example.com',
      phonenumber: '',
      language: 'en',
      newsletterOptIn: true,
      isPushNotificationEnabled: false,
    })
    expect(store.isPhoneAuth).toBe(false)

    const token = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        token,
        refreshToken: 'r1',
        expiresAt: Math.floor(Date.now() / 1000) + 1800,
      },
    })

    await store.verifyToken('123456')

    expect(store.loginUser).toBeNull()
  })

  it('sets isPhoneAuth to true for phone-based login', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        user: {
          id: 'ck1234567890abcd12345679',
          email: '',
          phonenumber: '+12345678901',
          language: 'en',
          newsletterOptIn: true,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useAuthStore()
    await store.sendMagicLink({ email: '', phonenumber: '+12345678901' })

    expect(store.isPhoneAuth).toBe(true)
  })

  it('saves phone number as authId after sendMagicLink success (phone)', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        user: {
          id: 'ck1234567890abcd12345679',
          email: '',
          phonenumber: '+12345678901',
          language: 'en',
          newsletterOptIn: true,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useAuthStore()
    const res = await store.sendMagicLink({ email: '', phonenumber: '+12345678901' })

    expect(res.success).toBe(true)
    expect(localStorage.getItem('authId')).toBe('+12345678901')
  })

  it('clears authId after successful verifyToken', async () => {
    localStorage.setItem('authId', 'test@example.com')

    const token = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        token,
        refreshToken: 'r1',
        expiresAt: Math.floor(Date.now() / 1000) + 1800,
      },
    })

    const store = useAuthStore()
    const res = await store.verifyToken('123456')

    expect(res.success).toBe(true)
    expect(localStorage.getItem('authId')).toBeNull()
  })
})

describe('authStore refreshMediaToken', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  it('calls POST /auth/media-token', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    await store.refreshMediaToken()
    expect(mockApi.post).toHaveBeenCalledWith('/auth/media-token')
  })

  it('deduplicates concurrent refresh calls into a single request', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    await Promise.all([store.refreshMediaToken(), store.refreshMediaToken()])
    expect(mockApi.post).toHaveBeenCalledTimes(1)
  })

  it('allows a new refresh after the previous one completes', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    await store.refreshMediaToken()
    await store.refreshMediaToken()
    expect(mockApi.post).toHaveBeenCalledTimes(2)
  })

  it('resets dedup lock even when the request fails', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('network'))
    const store = useAuthStore()
    await store.refreshMediaToken().catch(() => {})
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    await store.refreshMediaToken()
    expect(mockApi.post).toHaveBeenCalledTimes(2)
  })

  it('skips refresh on app:tab-visible when token is not yet expired', async () => {
    const { bus } = await import('@/lib/bus')
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    store.setMediaTokenExpiry(futureExp)
    mockApi.post.mockClear()
    bus.emit('app:tab-visible')
    await new Promise((r) => setTimeout(r, 0))
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('refreshes on app:tab-visible when token is expired', async () => {
    const { bus } = await import('@/lib/bus')
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    const pastExp = Math.floor(Date.now() / 1000) - 10
    store.setMediaTokenExpiry(pastExp)
    mockApi.post.mockClear()
    bus.emit('app:tab-visible')
    await new Promise((r) => setTimeout(r, 0))
    expect(mockApi.post).toHaveBeenCalledWith('/auth/media-token')
  })

  it('refreshes immediately on app:tab-visible when expiresAt is unknown (0)', async () => {
    const { bus } = await import('@/lib/bus')
    mockApi.post.mockResolvedValue({ data: { success: true, expiresAt: 9999999999 } })
    const store = useAuthStore()
    // No setMediaTokenExpiry called — defaults to 0
    bus.emit('app:tab-visible')
    await new Promise((r) => setTimeout(r, 0))
    expect(mockApi.post).toHaveBeenCalledWith('/auth/media-token')
  })
})
