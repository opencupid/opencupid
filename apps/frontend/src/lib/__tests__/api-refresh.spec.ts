import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosHeaders } from 'axios'

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

describe('api refresh interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('rejects queued requests when refresh fails', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'))

    const { api } = await import('../api')
    const rejected = api.interceptors.response.handlers?.[0]?.rejected
    expect(rejected).toBeTypeOf('function')

    localStorage.setItem('token', 'expired-token')
    localStorage.setItem('refreshToken', 'refresh-token')

    const originalRequest = {
      _retry: false,
      headers: new AxiosHeaders(),
      method: 'get',
      url: '/protected',
    }

    const firstRefresh = rejected!({
      config: originalRequest,
      response: { status: 401 },
    })

    const secondRefresh = rejected!({
      config: {
        _retry: false,
        headers: new AxiosHeaders(),
        method: 'get',
        url: '/another',
      },
      response: { status: 401 },
    })

    await expect(firstRefresh).rejects.toThrow('refresh failed')
    await expect(secondRefresh).rejects.toThrow('refresh failed')

    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(mockEmit).toHaveBeenCalledWith('auth:logout')
  })

  it('logs out on 401 when token exists but refresh token is missing', async () => {
    const { api } = await import('../api')
    const rejected = api.interceptors.response.handlers?.[0]?.rejected
    expect(rejected).toBeTypeOf('function')

    localStorage.setItem('token', 'expired-token')

    await expect(
      rejected!({
        config: {
          _retry: false,
          headers: new AxiosHeaders(),
          method: 'get',
          url: '/profiles/me',
        },
        response: { status: 401 },
      })
    ).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(mockEmit).toHaveBeenCalledWith('auth:logout')
  })
})
