import { vi, describe, it, expect } from 'vitest'
import { mapProfileImagesToOwner, mapToLocalizedUpserts } from '../../api/mappers/profile.mappers'
vi.mock('@/lib/appconfig', () => ({ appConfig: { IMAGE_URL_BASE: 'http://img', IMAGE_URL_HMAC_TTL_SECONDS: 3600, AUTH_IMG_HMAC_SECRET: 'x' } }))
vi.mock('@/services/image.service', () => ({
  ImageService: { getInstance: () => ({ getSignedUrls: () => [{ size: 'thumb', url: 'http://img/signed' }] }) },
}))

const image: any = {
  id: 'ckaaaaaaaaaaaaaab',
  userId: 'ckbbbbbbbbbbbbbb',
  profileId: null,
  position: 0,
  altText: '',
  storagePath: 'path/to/img',
  width: null,
  height: null,
  mimeType: 'image/jpeg',
  createdAt: new Date(),
  updatedAt: new Date(),
  contentHash: null,
  isModerated: false,
  isFlagged: false,
}

describe('mappers', () => {
  it('adds signed variants to profile images', () => {
    const res = mapProfileImagesToOwner([image])
    expect(res[0]).toHaveProperty('variants')
    expect(res[0].variants[0]).toEqual({ size: 'thumb', url: 'http://img/signed' })
  })

  it('creates upsert payloads from localized data', () => {
    const upserts = mapToLocalizedUpserts('p1', {
      introSocialLocalized: { en: 'hi', fr: 'salut' },
      introDatingLocalized: { en: 'hey' },
    })
    expect(upserts).toContainEqual({ locale: 'en', updates: { introSocial: 'hi', introDating: 'hey' } })
    expect(upserts).toContainEqual({ locale: 'fr', updates: { introSocial: 'salut' } })
  })
})
