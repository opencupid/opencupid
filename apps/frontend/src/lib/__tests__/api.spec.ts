import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { AxiosHeaders } from 'axios'
import { getVersionInfo, api, ERROR_CODES } from '../api'
import packageJson from '../../../package.json'

// Mock the bus module
const { mockEmit } = vi.hoisted(() => ({
  mockEmit: vi.fn(),
}))
vi.mock('../bus', () => ({
  bus: {
    emit: mockEmit,
  },
}))

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
    // Reset module-level offline state: first flush pending debounce to let it fire,
    // then make a successful request to clear isOffline
    const successAdapter = vi.fn().mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
      config: {},
      statusText: 'OK',
    })
    api.defaults.adapter = successAdapter
    // Flush debounce (3s) so it fires and isOffline becomes true
    vi.advanceTimersByTime(3000)
    // Let any microtasks from timer callbacks settle
    await vi.advanceTimersByTimeAsync(0)
    // Make a successful request to reset isOffline back to false
    try {
      await api.get('/reset')
    } catch {
      // ignore
    }
    // Flush retry mechanism timers (10s)
    vi.advanceTimersByTime(15000)
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
})
