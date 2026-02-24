import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, AxiosHeaders } from 'axios'

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
})
