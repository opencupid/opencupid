import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
    IMAGE_URL_HMAC_WINDOW_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'test-secret',
    NODE_ENV: 'development',
  },
}))

import { generateMediaToken } from '../../lib/media'

describe('generateMediaToken (cookie value)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:15:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('produces exp:sig format', () => {
    const { value } = generateMediaToken()
    const [expStr, sig] = value.split(':')
    expect(Number(expStr)).toBeGreaterThan(0)
    expect(sig).toMatch(/^[a-f0-9]{64}$/)
  })

  it('sig verifies with HMAC-SHA256 of exp string', () => {
    const { value } = generateMediaToken()
    const [expStr, sig] = value.split(':')
    const expected = createHmac('sha256', 'test-secret').update(expStr).digest('hex')
    expect(sig).toBe(expected)
  })

  it('maxAge equals the configured TTL', () => {
    const { maxAge } = generateMediaToken()
    expect(maxAge).toBe(3600)
  })
})
