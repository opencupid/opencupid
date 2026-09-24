import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('preloadErrorReload', () => {
  const reloadMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    reloadMock.mockClear()
    sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reloads the page on vite:preloadError', async () => {
    await import('../preloadErrorReload')
    window.dispatchEvent(new Event('vite:preloadError'))

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within the same session after the first error', async () => {
    await import('../preloadErrorReload')
    window.dispatchEvent(new Event('vite:preloadError'))
    window.dispatchEvent(new Event('vite:preloadError'))

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('allows another reload after clearPreloadErrorReloadGuard is called', async () => {
    const { clearPreloadErrorReloadGuard } = await import('../preloadErrorReload')

    window.dispatchEvent(new Event('vite:preloadError'))
    expect(reloadMock).toHaveBeenCalledTimes(1)

    clearPreloadErrorReloadGuard()
    window.dispatchEvent(new Event('vite:preloadError'))

    expect(reloadMock).toHaveBeenCalledTimes(2)
  })
})
