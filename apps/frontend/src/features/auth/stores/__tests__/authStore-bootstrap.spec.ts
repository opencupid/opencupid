/**
 * Tests the login flow sequencing between authStore.verifyToken and bootstrap.
 *
 * Critical invariant: by the time verifyToken resolves with success, the owner
 * profile must already be loaded in the store. This prevents a race condition
 * where UserHome (kept alive by <KeepAlive>) could check isOnboarded before
 * the profile fetch completes and skip the /onboarding redirect.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

const { mockApi, mockSafeApiCall, mockOnLogin } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
  mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
  mockOnLogin: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
  axios: { isAxiosError: vi.fn(() => false) },
}))

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ onLogin: mockOnLogin }),
}))

vi.stubGlobal('__APP_CONFIG__', { API_BASE_URL: 'http://localhost:3000', NODE_ENV: 'test' })
afterAll(() => vi.unstubAllGlobals())

import { useAuthStore } from '../authStore'

describe('authStore.verifyToken bootstrap sequencing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    mockOnLogin.mockResolvedValue(undefined)
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  it('calls onLogin after successful token verification', async () => {
    const token = makeJwt({ userId: 'u1', profileId: 'p1', exp: Date.now() / 1000 + 3600 })
    mockApi.get.mockResolvedValue({ data: { success: true, token } })

    const store = useAuthStore()
    await store.verifyToken('123456')

    expect(mockOnLogin).toHaveBeenCalledOnce()
  })

  it('profile is loaded before verifyToken resolves — onLogin awaited', async () => {
    // Simulate onLogin taking time to fetch the profile
    let onLoginResolved = false
    mockOnLogin.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      onLoginResolved = true
    })

    const token = makeJwt({ userId: 'u1', profileId: 'p1', exp: Date.now() / 1000 + 3600 })
    mockApi.get.mockResolvedValue({ data: { success: true, token } })

    const store = useAuthStore()
    const result = await store.verifyToken('123456')

    // By the time verifyToken resolves, onLogin must have completed
    expect(result.success).toBe(true)
    expect(onLoginResolved).toBe(true)
  })

  it('does not call onLogin when token verification fails', async () => {
    mockApi.get.mockResolvedValue({ data: { success: false } })

    const store = useAuthStore()
    const result = await store.verifyToken('wrong-token')

    expect(result.success).toBe(false)
    expect(mockOnLogin).not.toHaveBeenCalled()
  })
})
