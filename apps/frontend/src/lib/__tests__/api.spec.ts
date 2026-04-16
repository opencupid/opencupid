import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { AxiosHeaders } from 'axios'
import { getVersionInfo, api, ERROR_CODES } from '../api'
import packageJson from '../../../package.json'

// Mock the bus module — needs working on/emit so api.ts can register listeners
const { mockEmit, bus: mockBus } = vi.hoisted(() => {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {}
  const mockEmit = vi.fn((event: string, ...args: any[]) => {
    listeners[event]?.forEach((fn) => fn(...args))
  })
  return {
    mockEmit,
    bus: {
      emit: mockEmit,
      on: (event: string, fn: (...args: any[]) => void) => {
        ;(listeners[event] ??= []).push(fn)
      },
    },
  }
})
vi.mock('../bus', () => ({ bus: mockBus }))
vi.mock('../visibility', () => ({}))

// Mock __APP_CONFIG__ - this will be overridden in specific tests
vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production', // Default to production for existing tests
})
afterAll(() => vi.unstubAllGlobals())

let originalAdapter: any

describe('api error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useFakeTimers()
    originalAdapter = api.defaults.adapter
  })

  afterEach(async () => {
    // Reset state machine: emit app:visible in case we're SUSPENDED,
    // then make a successful request to get back to ONLINE
    const { bus } = await import('../bus')
    bus.emit('app:visible')

    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter
    vi.advanceTimersByTime(5000) // flush grace + debounce timers
    await vi.advanceTimersByTimeAsync(0)
    try {
      await api.get('/reset')
    } catch {
      // ignore
    }
    vi.advanceTimersByTime(15000) // flush retry timers
    await vi.advanceTimersByTimeAsync(0)
    api.defaults.adapter = originalAdapter
    vi.useRealTimers()
  })

  it('detects network errors correctly', () => {
    // Test the network error detection logic
    const testCases: { code?: string; response?: unknown; expected: boolean }[] = [
      ...ERROR_CODES.map((code) => ({ code, expected: true })),
      { response: null, expected: true }, // no response = network error
      { code: 'ERR_BAD_RESPONSE', response: { status: 500 }, expected: false },
      { code: 'SOME_OTHER_ERROR', response: { status: 500 }, expected: false },
    ]

    testCases.forEach(({ code, response, expected }) => {
      const error = { code, response }
      const isNetworkError = !error.response || ERROR_CODES.includes(error.code ?? '')

      expect(isNetworkError).toBe(expected)
    })
  })

  it('handles various network error codes', () => {
    for (const code of ERROR_CODES) {
      const mockError: { code: string; response?: unknown } = { code }

      const isNetworkError = !mockError.response || ERROR_CODES.includes(mockError.code)

      expect(isNetworkError).toBe(true)
    }
  })

  it('getVersionInfo requests /app/version and parses response', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        version: {
          updateAvailable: false,
          frontendVersion: packageJson.version,
          backendVersion: '1.0.0',
          currentVersion: packageJson.version,
        },
      },
    } as any)

    const result = await getVersionInfo()

    expect(result).toEqual({
      updateAvailable: false,
      frontendVersion: packageJson.version,
      backendVersion: '1.0.0',
      currentVersion: packageJson.version,
    })
    expect(getSpy).toHaveBeenCalledWith('/app/version', {
      params: { v: packageJson.version },
      timeout: undefined,
    })
  })

  it('getVersionInfo forwards timeout option', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        version: {
          updateAvailable: true,
          frontendVersion: '9.9.9',
          backendVersion: '1.0.0',
          currentVersion: packageJson.version,
        },
      },
    } as any)

    await getVersionInfo({ timeout: 5000 })

    expect(getSpy).toHaveBeenCalledWith('/app/version', {
      params: { v: packageJson.version },
      timeout: 5000,
    })
  })

  it('debounces offline detection — emits api:offline only after delay', async () => {
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    // Not emitted immediately
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')

    // Emitted after the debounce period
    vi.advanceTimersByTime(3000)
    expect(mockEmit).toHaveBeenCalledWith('api:offline')
  })

  it('cancels offline transition when a successful response arrives during debounce', async () => {
    let callCount = 0
    const mockAdapter = vi.fn().mockImplementation((config: any) => {
      callCount++
      if (callCount === 1) {
        return Promise.reject({
          code: 'ERR_NETWORK',
          config: { ...config, headers: config.headers || new AxiosHeaders() },
          isAxiosError: true,
        })
      }
      return Promise.resolve({
        status: 200,
        data: { ok: true },
        headers: {},
        config,
        statusText: 'OK',
      })
    })
    api.defaults.adapter = mockAdapter

    // First request fails — starts the debounce
    try {
      await api.get('/test')
    } catch {
      // expected
    }

    // Second request succeeds before debounce fires — cancels offline transition
    await api.get('/test')

    vi.advanceTimersByTime(3000)

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('suppresses offline detection when tab is hidden (SUSPENDED state)', async () => {
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    // Emit app:hidden to enter SUSPENDED state
    const { bus } = await import('../bus')
    bus.emit('app:hidden')

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    vi.advanceTimersByTime(5000)

    // Should NOT have emitted api:offline while suspended
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('cancels pending debounce when tab goes hidden', async () => {
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    // Trigger network error — starts debounce
    try {
      await api.get('/test')
    } catch {
      // expected
    }

    // Tab goes hidden before debounce fires
    const { bus } = await import('../bus')
    bus.emit('app:hidden')

    vi.advanceTimersByTime(5000)

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('enters RESUMING state on app:visible and suppresses errors during grace period', async () => {
    const { bus } = await import('../bus')

    // Go hidden then visible
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Network error during grace period should be suppressed
    const mockAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    vi.advanceTimersByTime(3000)
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('transitions from RESUMING to ONLINE on success response', async () => {
    const { bus } = await import('../bus')

    // Simulate was offline before suspend
    const failAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = failAdapter

    try {
      await api.get('/test')
    } catch {
      /* expected */
    }
    vi.advanceTimersByTime(3000) // fire debounce → OFFLINE

    expect(mockEmit).toHaveBeenCalledWith('api:offline')
    mockEmit.mockClear()

    // Suspend and resume
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Success response during RESUMING
    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter

    await api.get('/test')

    expect(mockEmit).toHaveBeenCalledWith('api:online')
  })

  it('returns to OFFLINE if was offline and grace period expires without success', async () => {
    const { bus } = await import('../bus')

    // Get into OFFLINE state
    const failAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = failAdapter

    try {
      await api.get('/test')
    } catch {
      /* expected */
    }
    vi.advanceTimersByTime(3000) // debounce → OFFLINE

    expect(mockEmit).toHaveBeenCalledWith('api:offline')
    mockEmit.mockClear()

    // Suspend and resume (health check will fail too)
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Let health check fail
    await vi.advanceTimersByTimeAsync(0)

    // Grace period expires (5s)
    vi.advanceTimersByTime(5000)
    await vi.advanceTimersByTimeAsync(0)

    // Should re-emit api:offline since we were offline before
    expect(mockEmit).toHaveBeenCalledWith('api:offline')
  })

  it('drains waitForRecovery when transitioning from DEBOUNCING to ONLINE', async () => {
    let callCount = 0
    const mockAdapter = vi.fn().mockImplementation((config: any) => {
      callCount++
      if (callCount === 1) {
        return Promise.reject({
          code: 'ERR_NETWORK',
          config: { ...config, headers: config.headers || new AxiosHeaders() },
          isAxiosError: true,
        })
      }
      return Promise.resolve({
        status: 200,
        data: { ok: true },
        headers: {},
        config,
        statusText: 'OK',
      })
    })
    api.defaults.adapter = mockAdapter

    // First request fails — starts debounce (state = DEBOUNCING)
    try {
      await api.get('/test')
    } catch {
      // expected
    }

    // Second request succeeds during DEBOUNCING — should transition to ONLINE
    // and resolve any waiters without emitting api:online (was never OFFLINE)
    await api.get('/test')

    expect(mockEmit).not.toHaveBeenCalledWith('api:online')
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('does not emit api:online on RESUMING→ONLINE when was not offline before suspend', async () => {
    const { bus } = await import('../bus')

    // Go hidden from ONLINE (wasOfflineBeforeSuspend = false), then visible
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Success response during RESUMING
    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter

    await api.get('/test')

    // Should NOT emit api:online since we were never offline
    expect(mockEmit).not.toHaveBeenCalledWith('api:online')
  })

  it('transitions RESUMING→SUSPENDED when tab goes hidden during grace period', async () => {
    const { bus } = await import('../bus')
    const failAdapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = failAdapter

    // Go hidden then visible (enters RESUMING with 5s grace)
    bus.emit('app:hidden')
    bus.emit('app:visible')

    // Tab goes hidden again during grace period
    bus.emit('app:hidden')

    // Grace period timer fires — should NOT transition to OFFLINE
    vi.advanceTimersByTime(5000)
    await vi.advanceTimersByTimeAsync(0)

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })
})
