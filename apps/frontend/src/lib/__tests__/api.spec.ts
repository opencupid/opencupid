import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { AxiosHeaders } from 'axios'
import { CanceledError } from 'axios'
import { getVersionInfo, api, isOutageError, ERROR_CODES } from '../api'
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

const { mockDiagnoseOutage } = vi.hoisted(() => ({ mockDiagnoseOutage: vi.fn() }))
vi.mock('../connectivity', () => ({ diagnoseOutage: mockDiagnoseOutage }))

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
    mockDiagnoseOutage.mockResolvedValue('network')
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

  it('isOutageError recognises failures that mean the API is unreachable', () => {
    const cases: { error: any; expected: boolean }[] = [
      ...ERROR_CODES.map((code) => ({ error: { code }, expected: true })),
      { error: { response: undefined }, expected: true }, // no response at all
      // Gateway answering for a dead backend (non-API body)
      { error: { response: { status: 502, data: 'Bad Gateway' } }, expected: true },
      { error: { response: { status: 503, data: 'no available server' } }, expected: true },
      { error: { response: { status: 504, data: 'Gateway Timeout' } }, expected: true },
      // The backend's own 5xx replies carry the API envelope
      { error: { response: { status: 503, data: { success: false } } }, expected: false },
      { error: { response: { status: 502, data: { success: false } } }, expected: false },
      { error: { code: 'ERR_BAD_RESPONSE', response: { status: 500 } }, expected: false },
      { error: { response: { status: 404, data: 'Not Found' } }, expected: false },
      { error: new CanceledError('cancelled'), expected: false },
    ]

    for (const { error, expected } of cases) {
      expect(isOutageError(error), JSON.stringify(error)).toBe(expected)
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
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())

    // Emitted after the debounce period
    vi.advanceTimersByTime(3000)
    await vi.advanceTimersByTimeAsync(0) // let the outage diagnosis settle
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'network' })
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

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
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
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
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

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
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
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
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

    await vi.advanceTimersByTimeAsync(0) // let the outage diagnosis settle
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'network' })
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

    await vi.advanceTimersByTimeAsync(0) // let the outage diagnosis settle
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'network' })
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
    await vi.advanceTimersByTimeAsync(0) // let the outage diagnosis settle
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'network' })
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
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
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

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())
  })

  const gatewayError = (config: any) => ({
    code: 'ERR_BAD_RESPONSE',
    config: { ...config, headers: config.headers || new AxiosHeaders() },
    response: { status: 502, data: 'Bad Gateway', headers: {}, config },
    isAxiosError: true,
  })

  it('treats a gateway error as an outage and diagnoses it from that response', async () => {
    mockDiagnoseOutage.mockResolvedValue('api')
    api.defaults.adapter = vi
      .fn()
      .mockImplementation((config) => Promise.reject(gatewayError(config)))

    await api.get('/test').catch(() => {})
    await vi.advanceTimersByTimeAsync(3000)

    expect(mockDiagnoseOutage).toHaveBeenCalledWith(
      expect.objectContaining({ response: expect.objectContaining({ status: 502 }) })
    )
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'api' })
  })

  it('re-emits api:offline when a retry changes the diagnosed cause', async () => {
    api.defaults.adapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })

    await api.get('/test').catch(() => {})
    await vi.advanceTimersByTimeAsync(3000)
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'network' })
    mockEmit.mockClear()

    // Same verdict on the next retry — nothing new to report
    await vi.advanceTimersByTimeAsync(10000)
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline', expect.anything())

    // The user's connection is back but the API still is not
    mockDiagnoseOutage.mockResolvedValue('api')
    await vi.advanceTimersByTimeAsync(10000)
    expect(mockEmit).toHaveBeenCalledWith('api:offline', { cause: 'api' })
  })

  it('re-checks immediately when the browser reports a network change while offline', async () => {
    const adapter = vi.fn().mockRejectedValue({
      code: 'ERR_NETWORK',
      config: { headers: new AxiosHeaders() },
      isAxiosError: true,
    })
    api.defaults.adapter = adapter

    await api.get('/test').catch(() => {})
    await vi.advanceTimersByTimeAsync(3000)
    adapter.mockClear()

    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('ignores browser network events while online', async () => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter

    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)

    expect(adapter).not.toHaveBeenCalled()
  })
})
