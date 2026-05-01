import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { CanceledError } from 'axios'

const mockEmit = vi.fn()
vi.mock('../bus', () => ({
  bus: {
    emit: mockEmit,
    on: vi.fn(),
  },
}))

vi.stubGlobal('__APP_CONFIG__', {
  API_BASE_URL: 'http://localhost:3000',
  NODE_ENV: 'production',
  DOMAIN: 'example.org',
})
afterAll(() => vi.unstubAllGlobals())

describe('api cancellation handling', () => {
  let originalAdapter: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const { api } = await import('../api')
    originalAdapter = api.defaults.adapter
  })

  afterEach(async () => {
    const { api } = await import('../api')
    api.defaults.adapter = originalAdapter
  })

  it('does not emit api:offline when an axios request is cancelled via AbortController', async () => {
    const { api } = await import('../api')

    api.defaults.adapter = vi.fn().mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          // Simulate the rejection axios produces when an in-flight request
          // is aborted via its signal.
          reject(new CanceledError('aborted'))
        })
    )

    const controller = new AbortController()
    controller.abort()

    await expect(api.get('/test', { signal: controller.signal })).rejects.toBeInstanceOf(
      CanceledError
    )

    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })

  it('safeApiCall rethrows CanceledError without retrying or driving the offline state', async () => {
    const { api, safeApiCall } = await import('../api')

    let calls = 0
    api.defaults.adapter = vi.fn().mockImplementation(() => {
      calls++
      return Promise.reject(new CanceledError('aborted'))
    })

    await expect(safeApiCall(() => api.get('/test'))).rejects.toBeInstanceOf(CanceledError)

    // Crucially: not retried (would loop forever) and not classified as offline.
    expect(calls).toBe(1)
    expect(mockEmit).not.toHaveBeenCalledWith('api:offline')
  })
})
