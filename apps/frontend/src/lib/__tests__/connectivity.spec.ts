import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { diagnoseOutage } from '../connectivity'

describe('diagnoseOutage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
  })

  it('blames the API when the failed request got an HTTP response', async () => {
    await expect(diagnoseOutage({ response: { status: 502 } })).resolves.toBe('api')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blames the network when the browser reports being offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await expect(diagnoseOutage({})).resolves.toBe('network')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blames the API when the app origin still answers', async () => {
    fetchMock.mockResolvedValue({ ok: true })

    await expect(diagnoseOutage({})).resolves.toBe('api')
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/sw.js`,
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' })
    )
  })

  it('counts any HTTP status from the app origin as proof of connectivity', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 })

    await expect(diagnoseOutage()).resolves.toBe('api')
  })

  it('blames the network when the app origin is unreachable too', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(diagnoseOutage()).resolves.toBe('network')
  })
})
