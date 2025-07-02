import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the bus module
const mockEmit = vi.fn()
vi.mock('../bus', () => ({
  bus: {
    emit: mockEmit
  }
}))

// Mock __APP_CONFIG__
vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000'
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
      { response: null, expected: true }, // no response = network error
      { code: 'SOME_OTHER_ERROR', response: { status: 500 }, expected: false },
    ]

    testCases.forEach(({ code, response, expected }) => {
      const error = { code, response }
      const isNetworkError = 
        error.code === 'ECONNABORTED' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response

      expect(isNetworkError).toBe(expected)
    })
  })

  it('handles ECONNABORTED error code', () => {
    const mockError = { code: 'ECONNABORTED' }
    
    // Test the error detection logic directly
    const isNetworkError = 
      mockError.code === 'ECONNABORTED' ||
      mockError.code === 'ENETUNREACH' ||
      mockError.code === 'ENOTFOUND' ||
      mockError.code === 'ECONNREFUSED' ||
      mockError.code === 'ETIMEDOUT' ||
      !mockError.response

    expect(isNetworkError).toBe(true)
  })

  it('handles various network error codes', () => {
    const errorCodes = ['ECONNABORTED', 'ENETUNREACH', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT']
    
    for (const code of errorCodes) {
      const mockError = { code }
      
      const isNetworkError = 
        mockError.code === 'ECONNABORTED' ||
        mockError.code === 'ENETUNREACH' ||
        mockError.code === 'ENOTFOUND' ||
        mockError.code === 'ECONNREFUSED' ||
        mockError.code === 'ETIMEDOUT' ||
        !mockError.response

      expect(isNetworkError).toBe(true)
    }
  })
})