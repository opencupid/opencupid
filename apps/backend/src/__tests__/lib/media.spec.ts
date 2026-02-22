import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
    IMAGE_URL_HMAC_TTL_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'test-secret',
  },
}))

import { signUrl } from '../../lib/media'

describe('signUrl', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
  })

  it('signs relative path without MEDIA_URL_BASE prefix', () => {
    const url = '/user-content/images/cmXXX/abc-card.webp'
    const result = signUrl(url)

    // The HMAC should be computed on 'images/cmXXX/abc-card.webp:exp' (without /user-content/ prefix)
    const exp = Math.floor(Date.now() / 1000) + 3600
    const expectedData = `images/cmXXX/abc-card.webp:${exp}`
    const expectedSig = createHmac('sha256', 'test-secret').update(expectedData).digest('hex')

    expect(result).toBe(`/user-content/images/cmXXX/abc-card.webp?exp=${exp}&sig=${expectedSig}`)
  })

  it('returns full URL with query params', () => {
    const result = signUrl('/user-content/images/path/to/file.webp')
    expect(result).toMatch(/^\/user-content\/images\/path\/to\/file\.webp\?exp=\d+&sig=[a-f0-9]+$/)
  })

  it('handles URLs that do not start with MEDIA_URL_BASE', () => {
    const url = 'some/other/path.webp'
    const result = signUrl(url)

    // Should sign the full path as-is since no prefix to strip
    const exp = Math.floor(Date.now() / 1000) + 3600
    const expectedData = `some/other/path.webp:${exp}`
    const expectedSig = createHmac('sha256', 'test-secret').update(expectedData).digest('hex')

    expect(result).toBe(`some/other/path.webp?exp=${exp}&sig=${expectedSig}`)
  })

  it('signs voice message URLs correctly', () => {
    const url = '/user-content/voice/cmXXX/1234567890-abc123.webm'
    const result = signUrl(url)

    const exp = Math.floor(Date.now() / 1000) + 3600
    const expectedData = `voice/cmXXX/1234567890-abc123.webm:${exp}`
    const expectedSig = createHmac('sha256', 'test-secret').update(expectedData).digest('hex')

    expect(result).toBe(
      `/user-content/voice/cmXXX/1234567890-abc123.webm?exp=${exp}&sig=${expectedSig}`
    )
  })
})
