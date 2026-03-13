import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
    IMAGE_URL_HMAC_WINDOW_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'test-secret',
  },
}))

import {
  imageBasePath,
  voiceBasePath,
  MEDIA_SUBDIR,
  mediaUrl,
  generateMediaToken,
} from '../../lib/media'

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

describe('mediaUrl', () => {
  it('returns a clean URL with no query params', () => {
    expect(mediaUrl('images/cmXXX/abc-card.webp')).toBe(
      '/user-content/images/cmXXX/abc-card.webp'
    )
  })

  it('works for voice paths', () => {
    expect(mediaUrl('voice/p1/msg-abc.webm')).toBe('/user-content/voice/p1/msg-abc.webm')
  })
})

describe('generateMediaToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns value in exp:sig format', () => {
    const { value } = generateMediaToken()
    expect(value).toMatch(/^\d+:[a-f0-9]+$/)
  })

  it('produces correct HMAC signature', () => {
    const { value } = generateMediaToken()
    const [expStr, sig] = value.split(':')
    const expected = createHmac('sha256', 'test-secret').update(expStr).digest('hex')
    expect(sig).toBe(expected)
  })

  it('sets exp to now + TTL', () => {
    const { value } = generateMediaToken()
    const exp = Number(value.split(':')[0])
    const nowSeconds = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000)
    expect(exp).toBe(nowSeconds + 3600)
  })

  it('returns maxAge equal to the configured TTL', () => {
    const { maxAge } = generateMediaToken()
    expect(maxAge).toBe(3600)
  })

  it('produces different tokens at different times', () => {
    const t1 = generateMediaToken().value

    vi.setSystemTime(new Date('2025-01-01T00:01:00Z'))
    const t2 = generateMediaToken().value

    expect(t1).not.toBe(t2)
  })
})
