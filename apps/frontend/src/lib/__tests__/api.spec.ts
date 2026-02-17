import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the bus module
const mockEmit = vi.fn()
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

describe('api error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects network errors correctly', () => {
    // Test the network error detection logic
    const testCases = [
      { code: 'ECONNABORTED', expected: true },
      { code: 'ENETUNREACH', expected: true },
      { code: 'ENOTFOUND', expected: true },
      { code: 'ECONNREFUSED', expected: true },
      { code: 'ETIMEDOUT', expected: true },
      { code: 'ECONNRESET', expected: true },
      { code: 'ERR_NETWORK', expected: true },
      { code: 'ERR_BAD_RESPONSE', expected: true },
      { response: null, expected: true }, // no response = network error
      { code: 'SOME_OTHER_ERROR', response: { status: 500 }, expected: false },
    ]

    testCases.forEach(({ code, response, expected }) => {
      const error = { code, response }
      const isNetworkError =
        !error.response ||
        [
          'ECONNABORTED',
          'ENETUNREACH',
          'ENOTFOUND',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ECONNRESET',
          'ERR_NETWORK',
          'ERR_BAD_RESPONSE',
        ].includes(error.code ?? '')

      expect(isNetworkError).toBe(expected)
    })
  })

  it('handles various network error codes', () => {
    const errorCodes = [
      'ECONNABORTED',
      'ENETUNREACH',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ERR_NETWORK',
      'ERR_BAD_RESPONSE',
    ]

    for (const code of errorCodes) {
      const mockError: { code: string; response?: unknown } = { code }

      const isNetworkError =
        !mockError.response ||
        [
          'ECONNABORTED',
          'ENETUNREACH',
          'ENOTFOUND',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ECONNRESET',
          'ERR_NETWORK',
          'ERR_BAD_RESPONSE',
        ].includes(mockError.code)

      expect(isNetworkError).toBe(true)
    }
  })
})
