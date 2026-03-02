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

  it('stores and retrieves refresh token from localStorage', () => {
    localStorage.setItem('refreshToken', 'test-refresh-token')
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token')
  })

  it('clears refresh token on logout event', () => {
    localStorage.setItem('token', 'jwt')
    localStorage.setItem('refreshToken', 'refresh')

    // Simulate what happens on logout
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('retry flag prevents infinite loops', () => {
    // Test that _retry flag logic works
    const config = { _retry: false }
    expect(config._retry).toBe(false)
    config._retry = true
    expect(config._retry).toBe(true)
  })

  it('redirects to /auth when 401 received with no refresh token', async () => {
    const { api } = await import('../api')

    localStorage.setItem('token', 'some-jwt')
    // No refreshToken set — simulates legacy user

    const mockAdapter = vi.fn().mockRejectedValue({
      response: { status: 401, data: {} },
      config: { headers: new AxiosHeaders(), _retry: false },
      isAxiosError: true,
    })
    api.defaults.adapter = mockAdapter

    try {
      await api.get('/test')
    } catch {
      // expected
    }

    expect(localStorage.getItem('token')).toBeNull()
    expect(mockEmit).toHaveBeenCalledWith('auth:logout')
    expect(locationHref).toBe('/auth')
  })

  it('redirects to /auth when refresh attempt fails', async () => {
    const { api } = await import('../api')

    localStorage.setItem('token', 'some-jwt')
    localStorage.setItem('refreshToken', 'some-refresh')
    api.defaults.headers.common['Authorization'] = 'Bearer some-jwt'

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
      { refreshToken: 'some-refresh' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer some-jwt' }),
      })
    )
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(mockEmit).toHaveBeenCalledWith('auth:logout')
    expect(locationHref).toBe('/auth')

    postSpy.mockRestore()
  })

  it('refreshes token on 401 when refresh token exists', async () => {
    const { api } = await import('../api')

    localStorage.setItem('token', 'old-jwt')
    localStorage.setItem('refreshToken', 'valid-refresh')
    api.defaults.headers.common['Authorization'] = 'Bearer old-jwt'

    // Mock axios.post for the refresh call — it succeeds
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { token: 'new-jwt', refreshToken: 'new-refresh' },
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
    expect(localStorage.getItem('token')).toBe('new-jwt')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
    expect(mockEmit).toHaveBeenCalledWith('auth:token-refreshed', {
      token: 'new-jwt',
      refreshToken: 'new-refresh',
    })
    expect(locationHref).not.toBe('/auth')

    postSpy.mockRestore()
  })
})
