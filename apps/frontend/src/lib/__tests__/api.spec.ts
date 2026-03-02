import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { AxiosError } from 'axios'

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
afterAll(() => vi.unstubAllGlobals())

describe('api error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects network errors correctly', async () => {
    const { isNetworkError } = await import('../api')

    const testCases = [
      { code: 'ECONNABORTED', expected: true },
      { code: 'ENETUNREACH', expected: true },
      { code: 'ENOTFOUND', expected: true },
      { code: 'ECONNREFUSED', expected: true },
      { code: 'ETIMEDOUT', expected: true },
      { code: 'ECONNRESET', expected: true },
      { code: 'ERR_NETWORK', expected: true },
      { code: 'ERR_BAD_RESPONSE', expected: true },
      { response: null, expected: true },
      { code: 'SOME_OTHER_ERROR', response: { status: 500 }, expected: false },
    ]

    testCases.forEach(({ code, response, expected }) => {
      expect(isNetworkError({ code, response })).toBe(expected)
    })
  })

  it('marks API online when a response is received while offline', async () => {
    const { api } = await import('../api')

    const rejected = api.interceptors.response.handlers[0].rejected

    await rejected(
      new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined as any)
    ).catch(() => undefined)
    expect(mockEmit).toHaveBeenCalledWith('api:offline')

    await rejected(
      new AxiosError('Internal Server Error', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {},
        data: {},
      } as any)
    ).catch(() => undefined)

    expect(mockEmit).toHaveBeenCalledWith('api:online')
  })
})
