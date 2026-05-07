/**
 * Tests the login signalling between authStore.verifyToken and the
 * bootstrap orchestrator (lib/auth.ts).
 *
 * Architecture:
 *   - verifyToken emits `auth:login` on the bus on success and returns.
 *   - lib/auth.ts subscribes to `auth:login`, kicks off bootstrap, and
 *     exposes `bootstrapReady()` so post-login navigation paths can await
 *     bootstrap completion before pushing to authenticated routes.
 *   - authStore is decoupled from bootstrap — it does not import lib/auth
 *     or lib/bootstrap directly.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

const { mockApi, mockSafeApiCall, mockBusEmit } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
  mockSafeApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
  mockBusEmit: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: mockSafeApiCall,
  axios: { isAxiosError: vi.fn(() => false) },
}))

vi.mock('@/lib/bus', () => ({
  bus: { emit: mockBusEmit, on: vi.fn() },
}))

vi.stubGlobal('__APP_CONFIG__', { API_BASE_URL: 'http://localhost:3000', NODE_ENV: 'test' })
afterAll(() => vi.unstubAllGlobals())

import { useAuthStore } from '../authStore'

describe('authStore.verifyToken signals login via bus', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    mockSafeApiCall.mockImplementation((fn: () => Promise<unknown>) => fn())
  })

  it('emits auth:login after successful token verification', async () => {
    const token = makeJwt({ userId: 'u1', profileId: 'p1', exp: Date.now() / 1000 + 3600 })
    mockApi.get.mockResolvedValue({ data: { success: true, token } })

    const store = useAuthStore()
    const result = await store.verifyToken('123456')

    expect(result.success).toBe(true)
    expect(mockBusEmit).toHaveBeenCalledWith('auth:login', { userId: 'u1' })
  })

  it('does not emit auth:login when token verification fails', async () => {
    mockApi.get.mockResolvedValue({ data: { success: false } })

    const store = useAuthStore()
    const result = await store.verifyToken('wrong-token')

    expect(result.success).toBe(false)
    expect(mockBusEmit).not.toHaveBeenCalledWith('auth:login', expect.anything())
  })
})
