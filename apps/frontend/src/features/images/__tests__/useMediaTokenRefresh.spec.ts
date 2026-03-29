import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

import { api } from '@/lib/api'

// Re-import fresh module per test to reset the dedup promise
let refreshMediaToken: typeof import('../composables/useMediaTokenRefresh').refreshMediaToken

describe('refreshMediaToken', () => {
  beforeEach(async () => {
    vi.mocked(api.get).mockReset()
    // Fresh import to reset module-level state
    vi.resetModules()
    const mod = await import('../composables/useMediaTokenRefresh')
    refreshMediaToken = mod.refreshMediaToken
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls /app/version to refresh the media cookie', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    expect(api.get).toHaveBeenCalledWith('/app/version')
  })

  it('deduplicates concurrent calls into a single request', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    const p1 = refreshMediaToken()
    const p2 = refreshMediaToken()
    await Promise.all([p1, p2])
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('allows a new request after the previous one completes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    await refreshMediaToken()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('resets dedup lock even when the request fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network'))
    await refreshMediaToken().catch(() => {})
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    await refreshMediaToken()
    expect(api.get).toHaveBeenCalledTimes(2)
  })
})
