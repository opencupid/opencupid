import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
    IMAGE_URL_HMAC_WINDOW_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'test-secret',
  },
}))

const WINDOW = 3600

import { imageBasePath, voiceBasePath, MEDIA_SUBDIR, signUrl } from '../../lib/media'

function computeWindowExp(nowSeconds: number): number {
  return (Math.floor(nowSeconds / WINDOW) + 1) * WINDOW
}

function computeSig(path: string, exp: number): string {
  return createHmac('sha256', 'test-secret').update(`${path}:${exp}`).digest('hex')
}

describe('MEDIA_SUBDIR', () => {
  it('defines expected subdirectory names', () => {
    expect(MEDIA_SUBDIR.IMAGES).toBe('images')
    expect(MEDIA_SUBDIR.VOICE).toBe('voice')
    expect(MEDIA_SUBDIR.TMP).toBe('tmp')
  })
})

describe('imageBasePath', () => {
  it('prepends images/ to a storagePath', () => {
    expect(imageBasePath('cmXXX/abc123')).toBe('images/cmXXX/abc123')
  })

  it('handles nested paths', () => {
    expect(imageBasePath('userA/subdir/slug')).toBe('images/userA/subdir/slug')
  })
})

describe('voiceBasePath', () => {
  it('prepends voice/ to a storagePath', () => {
    expect(voiceBasePath('p1/msg-abc.webm')).toBe('voice/p1/msg-abc.webm')
  })
})

describe('signUrl', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('signs relative path without MEDIA_URL_BASE prefix', () => {
    const url = '/user-content/images/cmXXX/abc-card.webp'
    const result = signUrl(url)

    const nowSeconds = Math.floor(Date.now() / 1000)
    const exp = computeWindowExp(nowSeconds)
    const sig = computeSig('images/cmXXX/abc-card.webp', exp)

    expect(result).toBe(`/user-content/images/cmXXX/abc-card.webp?exp=${exp}&sig=${sig}`)
  })

  it('returns full URL with query params', () => {
    const result = signUrl('/user-content/images/path/to/file.webp')
    expect(result).toMatch(/^\/user-content\/images\/path\/to\/file\.webp\?exp=\d+&sig=[a-f0-9]+$/)
  })

  it('handles URLs that do not start with MEDIA_URL_BASE', () => {
    const url = 'some/other/path.webp'
    const result = signUrl(url)

    const nowSeconds = Math.floor(Date.now() / 1000)
    const exp = computeWindowExp(nowSeconds)
    const sig = computeSig('some/other/path.webp', exp)

    expect(result).toBe(`some/other/path.webp?exp=${exp}&sig=${sig}`)
  })

  it('signs voice message URLs correctly', () => {
    const url = '/user-content/voice/cmXXX/1234567890-abc123.webm'
    const result = signUrl(url)

    const nowSeconds = Math.floor(Date.now() / 1000)
    const exp = computeWindowExp(nowSeconds)
    const sig = computeSig('voice/cmXXX/1234567890-abc123.webm', exp)

    expect(result).toBe(`/user-content/voice/cmXXX/1234567890-abc123.webm?exp=${exp}&sig=${sig}`)
  })

  it('produces identical URLs within the same window', () => {
    const url = '/user-content/images/cmXXX/abc-card.webp'

    vi.setSystemTime(new Date('2025-01-01T00:05:00Z'))
    const result1 = signUrl(url)

    vi.setSystemTime(new Date('2025-01-01T00:30:00Z'))
    const result2 = signUrl(url)

    expect(result1).toBe(result2)
  })

  it('produces different URLs across window boundaries', () => {
    const url = '/user-content/images/cmXXX/abc-card.webp'

    vi.setSystemTime(new Date('2025-01-01T00:59:59Z'))
    const result1 = signUrl(url)

    vi.setSystemTime(new Date('2025-01-01T01:00:00Z'))
    const result2 = signUrl(url)

    expect(result1).not.toBe(result2)
  })

  it('sets exp to the end of the current window', () => {
    // At 00:15:00, the window [00:00:00, 01:00:00) should have exp = 01:00:00
    vi.setSystemTime(new Date('2025-01-01T00:15:00Z'))
    const url = '/user-content/images/test.webp'
    const result = signUrl(url)

    const windowEnd = computeWindowExp(
      Math.floor(new Date('2025-01-01T00:15:00Z').getTime() / 1000)
    )
    const expectedEnd = new Date('2025-01-01T01:00:00Z').getTime() / 1000

    expect(windowEnd).toBe(expectedEnd)
    expect(result).toContain(`exp=${windowEnd}`)
  })
})
