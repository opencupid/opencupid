import { vi, describe, it, expect } from 'vitest'
import {
  mapProfileImagesToOwner,
  mapToLocalizedUpserts,
  mapProfileToPublic,
} from '../../api/mappers/profile.mappers'
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    IMAGE_URL_BASE: 'http://img',
    IMAGE_URL_HMAC_TTL_SECONDS: 3600,
    AUTH_IMG_HMAC_SECRET: 'x',
  },
}))
vi.mock('@/services/image.service', () => ({
  ImageService: {
    getInstance: () => ({ getSignedUrls: () => [{ size: 'thumb', url: 'http://img/signed' }] }),
  },
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
  blurhash: null,
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
    expect(upserts).toContainEqual({
      locale: 'en',
      updates: { introSocial: 'hi', introDating: 'hey' },
    })
    expect(upserts).toContainEqual({ locale: 'fr', updates: { introSocial: 'salut' } })
  })

  describe('mapProfileToPublic', () => {
    const baseProfile: any = {
      id: 'ckaaaaaaaaaaaaaab',
      publicName: 'Test User',
      country: 'US',
      cityName: 'Test City',
      isSocialActive: true,
      isDatingActive: true,
      isActive: true,
      isReported: false,
      isBlocked: false,
      isOnboarded: true,
      userId: 'ckbbbbbbbbbbbbbb',
      work: 'Developer',
      languages: ['en'],
      birthday: new Date('1990-01-01'),
      gender: 'male',
      pronouns: 'he_him',
      relationship: 'single',
      hasKids: 'no',
      prefAgeMin: 25,
      prefAgeMax: 35,
      prefGender: 'female',
      prefKids: 'no',
      lat: 40.7128,
      lon: -74.006,
      createdAt: new Date(),
      updatedAt: new Date(),
      profileImages: [],
      tags: [],
      localized: [],
    }

    it('should fallback to non-empty value when preferred locale has empty value', () => {
      const profileWithEmptyPreferredLocale = {
        ...baseProfile,
        localized: [
          {
            id: 'ckc1111111111111',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'de',
            value: '',
          }, // Empty German
          {
            id: 'ckc2222222222222',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'en',
            value: 'Hello world',
          }, // Non-empty English
          {
            id: 'ckc3333333333333',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'de',
            value: '',
          }, // Empty German
          {
            id: 'ckc4444444444444',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'en',
            value: 'Looking for love',
          }, // Non-empty English
        ],
      }

      const result = mapProfileToPublic(profileWithEmptyPreferredLocale, true, 'de')

      // Should fallback to English values since German values are empty
      expect(result.introSocial).toBe('Hello world')
      expect(result.introDating).toBe('Looking for love')
    })

    it('should use preferred locale when value is not empty', () => {
      const profileWithNonEmptyPreferredLocale = {
        ...baseProfile,
        localized: [
          {
            id: 'ckc1111111111111',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'de',
            value: 'Hallo Welt',
          }, // Non-empty German
          {
            id: 'ckc2222222222222',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'en',
            value: 'Hello world',
          }, // Non-empty English
          {
            id: 'ckc3333333333333',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'de',
            value: 'Suche nach Liebe',
          }, // Non-empty German
          {
            id: 'ckc4444444444444',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'en',
            value: 'Looking for love',
          }, // Non-empty English
        ],
      }

      const result = mapProfileToPublic(profileWithNonEmptyPreferredLocale, true, 'de')

      // Should use German values since they are not empty
      expect(result.introSocial).toBe('Hallo Welt')
      expect(result.introDating).toBe('Suche nach Liebe')
    })

    it('should return empty string when all values are empty', () => {
      const profileWithAllEmptyValues = {
        ...baseProfile,
        localized: [
          {
            id: 'ckc1111111111111',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'de',
            value: '',
          },
          {
            id: 'ckc2222222222222',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'en',
            value: '',
          },
          {
            id: 'ckc3333333333333',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'de',
            value: '',
          },
          {
            id: 'ckc4444444444444',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'en',
            value: '',
          },
        ],
      }

      const result = mapProfileToPublic(profileWithAllEmptyValues, true, 'de')

      expect(result.introSocial).toBe('')
      expect(result.introDating).toBe('')
    })

    it('should handle whitespace-only values as empty', () => {
      const profileWithWhitespaceValues = {
        ...baseProfile,
        localized: [
          {
            id: 'ckc1111111111111',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'de',
            value: '   ',
          }, // Whitespace German
          {
            id: 'ckc2222222222222',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introSocial',
            locale: 'en',
            value: 'Hello world',
          }, // Non-empty English
          {
            id: 'ckc3333333333333',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'de',
            value: '\t\n ',
          }, // Whitespace German
          {
            id: 'ckc4444444444444',
            profileId: 'ckaaaaaaaaaaaaaab',
            field: 'introDating',
            locale: 'en',
            value: 'Looking for love',
          }, // Non-empty English
        ],
      }

      const result = mapProfileToPublic(profileWithWhitespaceValues, true, 'de')

      // Should fallback to English values since German values are only whitespace
      expect(result.introSocial).toBe('Hello world')
      expect(result.introDating).toBe('Looking for love')
    })

    it('should return empty string when no localized entries exist', () => {
      const profileWithNoLocalizedEntries = {
        ...baseProfile,
        localized: [],
      }

      const result = mapProfileToPublic(profileWithNoLocalizedEntries, true, 'de')

      expect(result.introSocial).toBe('')
      expect(result.introDating).toBe('')
    })
  })
})
