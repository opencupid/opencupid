import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import Cookies from 'universal-cookie'
import { SESSION_COOKIE } from '@shared/session'
import { useAuthStore } from '../authStore'

const { mockApi, mockSafeApiCall } = vi.hoisted(() => {
  const responseInterceptors: ((res: any) => any)[] = []
  return {
    mockApi: {
      get: vi.fn(),
      post: vi.fn(),
      defaults: {
        headers: { common: {} as Record<string, string> },
        baseURL: 'http://localhost:3000',
      },
      interceptors: {
        response: {
          use: vi.fn((fn: (res: any) => any) => {
            responseInterceptors.push(fn)
            return responseInterceptors.length - 1
          }),
          eject: vi.fn((id: number) => {
            responseInterceptors.splice(id, 1)
          }),
          _run: (res: any) => responseInterceptors.forEach((fn) => fn(res)),
        },
      },
    },
    mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
  }
})

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
  axios: { isAxiosError: vi.fn(() => false), post: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/lib/bus', async () => {
  const { default: mitt } = await import('mitt')
  return { bus: mitt() }
})

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ onLogin: vi.fn().mockResolvedValue(undefined) }),
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
  DOMAIN: 'example.org',
})
afterAll(() => vi.unstubAllGlobals())

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

const cookies = new Cookies()

function setSessionCookie(token: string) {
  cookies.set(SESSION_COOKIE, token, { path: '/', sameSite: 'strict' })
}

function clearSessionCookie() {
  cookies.remove(SESSION_COOKIE, { path: '/' })
}

function getSessionCookie(): string | undefined {
  return cookies.get(SESSION_COOKIE) || undefined
}

describe('authStore initialize', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    clearSessionCookie()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearSessionCookie()
  })

  it('keeps expired JWT on initialize (refresh handled by interceptor)', () => {
    const expiredToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) - 3600,
    })
    setSessionCookie(expiredToken)

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(true)
    expect(store.isInitialized).toBe(true)
    expect(getSessionCookie()).toBe(expiredToken)
  })

  it('keeps valid JWT on initialize', () => {
    const validToken = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    setSessionCookie(validToken)

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(true)
    expect(store.isInitialized).toBe(true)
    expect(store.userId).toBe('u1')
  })

  it('migrates legacy localStorage token to Bearer header on initialize', () => {
    const token = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', 'old-refresh')

    const store = useAuthStore()
    store.initialize()

    // Should set Bearer header for backend migration
    expect(mockApi.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`)
    expect(store.isLoggedIn).toBe(true)
    expect(store.userId).toBe('u1')

    // Simulate first successful API response — header + localStorage cleaned up
    mockApi.interceptors.response._run({})
    expect(mockApi.defaults.headers.common['Authorization']).toBeUndefined()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('clears malformed JWT on initialize', () => {
    setSessionCookie('not-a-valid-jwt')

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(false)
    expect(store.isInitialized).toBe(true)
    expect(getSessionCookie()).toBeUndefined()
  })
})

describe('authStore localStorage auth flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    clearSessionCookie()
    vi.clearAllMocks()
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  afterEach(() => {
    clearSessionCookie()
  })

  it('saves authId in localStorage after sendMagicLink success', async () => {
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
    const res = await store.sendMagicLink({ email: 'test@example.com' })

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

    await store.sendMagicLink({ email: 'test@example.com' })

    expect(store.loginUser).toEqual({
      id: 'ck1234567890abcd12345678',
      email: 'test@example.com',
      phonenumber: '',
      language: 'en',
      newsletterOptIn: true,
      isPushNotificationEnabled: false,
    })

    const token = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    mockApi.get.mockResolvedValue({
      data: { success: true, token },
    })

    await store.verifyToken('123456')

    expect(store.loginUser).toBeNull()
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
      },
    })

    const store = useAuthStore()
    const res = await store.verifyToken('123456')

    expect(res.success).toBe(true)
    expect(localStorage.getItem('authId')).toBeNull()
  })

  it('setAuthState does not write token to localStorage', () => {
    const store = useAuthStore()
    const token = makeJwt({
      userId: 'u1',
      profileId: 'p1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    store.setAuthState(token)

    expect(localStorage.getItem('token')).toBeNull()
    expect(store.userId).toBe('u1')
    expect(store.profileId).toBe('p1')
  })

  it('logout clears state without touching localStorage', () => {
    const store = useAuthStore()

    store.userId = 'u1'
    store.logout()

    expect(store.userId).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('auth:logout handler re-emits auth:logged-out after teardown', async () => {
    const { bus } = await import('@/lib/bus')
    const store = useAuthStore()
    store.userId = 'u1'

    const loggedOutSpy = vi.fn()
    bus.on('auth:logged-out', loggedOutSpy)

    bus.emit('auth:logout')

    expect(loggedOutSpy).toHaveBeenCalledTimes(1)
    expect(store.userId).toBeNull()

    bus.off('auth:logged-out', loggedOutSpy)
  })

  it('auth:logout clears both host-only and domain-scoped session cookie shapes', async () => {
    const { bus } = await import('@/lib/bus')
    const removeSpy = vi.spyOn(Cookies.prototype, 'remove')
    const store = useAuthStore()
    store.userId = 'u1'

    bus.emit('auth:logout')

    const sessionRemoves = removeSpy.mock.calls.filter(([name]) => name === SESSION_COOKIE)
    // Phase 1 silent migration: delete both pre- and post-migration shapes
    // because universal-cookie only wipes the slot whose attributes match.
    expect(sessionRemoves).toContainEqual([SESSION_COOKIE, { path: '/' }])
    expect(sessionRemoves).toContainEqual([
      SESSION_COOKIE,
      { path: '/', sameSite: 'lax', domain: '.example.org' },
    ])

    removeSpy.mockRestore()
  })
})
