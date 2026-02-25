import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
})

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
    const { useAuthStore } = await import('../authStore')
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
    const { useAuthStore } = await import('../authStore')
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
    const { useAuthStore } = await import('../authStore')
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
    const { useAuthStore } = await import('../authStore')
    localStorage.setItem('token', 'not-a-valid-jwt')

    const store = useAuthStore()
    store.initialize()

    expect(store.isLoggedIn).toBe(false)
    expect(store.isInitialized).toBe(true)
    expect(localStorage.getItem('token')).toBeNull()
  })
})
