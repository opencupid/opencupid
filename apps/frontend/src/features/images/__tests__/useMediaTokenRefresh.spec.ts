import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}))

vi.mock('@/lib/bus', () => {
  const handlers = new Map<string, () => void>()
  return {
    bus: {
      on: vi.fn((event: string, handler: () => void) => handlers.set(event, handler)),
      emit: vi.fn((event: string) => handlers.get(event)?.()),
    },
  }
})

import { api } from '@/lib/api'
import { bus } from '@/lib/bus'

// Re-import fresh module per test to reset the dedup promise
let refreshMediaToken: typeof import('../composables/useMediaTokenRefresh').refreshMediaToken

describe('refreshMediaToken', () => {
  beforeEach(async () => {
    vi.mocked(api.post).mockReset()
    vi.resetModules()
    const mod = await import('../composables/useMediaTokenRefresh')
    refreshMediaToken = mod.refreshMediaToken
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls /auth/media-token to refresh the media cookie', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    expect(api.post).toHaveBeenCalledWith('/auth/media-token')
  })

  it('deduplicates concurrent calls into a single request', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const p1 = refreshMediaToken()
    const p2 = refreshMediaToken()
    await Promise.all([p1, p2])
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('allows a new request after the previous one completes', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    await refreshMediaToken()
    expect(api.post).toHaveBeenCalledTimes(2)
  })

  it('resets dedup lock even when the request fails', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('network'))
    await refreshMediaToken().catch(() => {})
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    expect(api.post).toHaveBeenCalledTimes(2)
  })
})

describe('visibilitychange via bus', () => {
  it('registers a listener for app:tab-visible', async () => {
    vi.mocked(api.post).mockReset()
    vi.resetModules()
    await import('../composables/useMediaTokenRefresh')
    expect(bus.on).toHaveBeenCalledWith('app:tab-visible', expect.any(Function))
  })
})
