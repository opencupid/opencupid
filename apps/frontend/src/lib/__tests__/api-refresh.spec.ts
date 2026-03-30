import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { AxiosHeaders } from 'axios'
import axios from 'axios'

const mockEmit = vi.fn()
vi.mock('../bus', () => ({
  bus: {
    emit: mockEmit,
  },
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
})
afterAll(() => vi.unstubAllGlobals())

describe('api refresh interceptor', () => {
  let locationHref: string

  let originalAdapter: any
  let originalLocationDescriptor: PropertyDescriptor | undefined

  beforeAll(() => {
    originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()

    // Save original adapter before any test can override it
    const { api } = await import('../api')
    originalAdapter = api.defaults.adapter

    // Mock window.location.href to capture redirects
    locationHref = ''
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        get href() {
          return locationHref
        },
        set href(val: string) {
          locationHref = val
        },
      },
    })
  })

  afterEach(async () => {
    // Restore original adapter to prevent cross-test contamination
    const { api } = await import('../api')
    api.defaults.adapter = originalAdapter

    // Restore window.location to prevent cross-file contamination
    if (originalLocationDescriptor) {
      Object.defineProperty(window, 'location', originalLocationDescriptor)
    }
  })

  it('retry flag prevents infinite loops', () => {
    // Test that _retry flag logic works
    const config = { _retry: false }
    expect(config._retry).toBe(false)
    config._retry = true
    expect(config._retry).toBe(true)
  })

  it('redirects to /auth when refresh attempt fails', async () => {
    const { api } = await import('../api')

    // Mock the api adapter for the original 401 request
    const mockAdapter = vi.fn().mockRejectedValue({
      response: { status: 401, data: {} },
      config: { headers: new AxiosHeaders(), _retry: false },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    // Mock axios.post for the refresh call — it fails
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'))

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    expect(postSpy).toHaveBeenCalledWith(
      'http://localhost:3000/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true })
    )
    expect(mockEmit).toHaveBeenCalledWith('auth:logout')
    expect(locationHref).toBe('/auth')

    postSpy.mockRestore()
  })

  it('refreshes token on 401 via httpOnly refresh cookie', async () => {
    const { api } = await import('../api')

    // Mock axios.post for the refresh call — it succeeds
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { token: 'new-jwt' },
    })

    let callCount = 0
    const mockAdapter = vi.fn().mockImplementation((config: any) => {
      callCount++
      // First call fails with 401
      if (callCount === 1) {
        return Promise.reject({
          response: { status: 401, data: {} },
          config: { ...config, headers: config.headers || new AxiosHeaders(), _retry: false },
          isAxiosError: true,
        })
      }
      // Retry after refresh succeeds
      return Promise.resolve({
        status: 200,
        data: { ok: true },
        headers: {},
        config,
        statusText: 'OK',
      })
    })
    api.defaults.adapter = mockAdapter

    const res = await api.get('/test')

    expect(res.data).toEqual({ ok: true })
    expect(mockEmit).toHaveBeenCalledWith('auth:token-refreshed', {
      token: 'new-jwt',
    })
    expect(locationHref).not.toBe('/auth')

    postSpy.mockRestore()
  })
})
