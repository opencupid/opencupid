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

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
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
      },
    })

    const store = useAuthStore()
    const res = await store.verifyToken('123456')

    expect(res.success).toBe(true)
    expect(localStorage.getItem('authId')).toBeNull()
  })
})
