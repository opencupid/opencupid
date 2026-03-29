import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
  },
}))

import { imageBasePath, voiceBasePath, MEDIA_SUBDIR, mediaUrl } from '../../lib/media'

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
    expect(mediaUrl('images/cmXXX/abc-card.webp')).toBe('/user-content/images/cmXXX/abc-card.webp')
  })

  it('works for voice paths', () => {
    expect(mediaUrl('voice/p1/msg-abc.webm')).toBe('/user-content/voice/p1/msg-abc.webm')
  })
})
