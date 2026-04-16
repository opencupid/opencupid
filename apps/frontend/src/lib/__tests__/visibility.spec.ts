import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockEmit = vi.fn()
vi.mock('@/lib/bus', () => ({
  bus: { emit: mockEmit },
}))

describe('visibility', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits app:hidden when document becomes hidden', async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })

    await import('../visibility')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockEmit).toHaveBeenCalledWith('app:hidden')
    expect(mockEmit).not.toHaveBeenCalledWith('app:visible')
  })

  it('emits app:visible when document becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })

    await import('../visibility')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockEmit).toHaveBeenCalledWith('app:visible')
    expect(mockEmit).not.toHaveBeenCalledWith('app:hidden')
  })
})
