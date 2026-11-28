import { vi, describe, it, expect } from 'vitest'
import {
  mapProfileImagesToOwner,
  mapProfileImagesToPublic,
  mapToLocalizedUpserts,
  mapProfileToPublic,
  visibleProfileImages,
} from '../../api/mappers/profile.mappers'
import { DbTagToPublicTagTransform } from '../../api/mappers/tag.mappers'
import { toPublicImage } from '../../api/mappers/image.mappers'
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    MEDIA_URL_BASE: '/user-content',
  },
}))
vi.mock('@/services/image.service', () => ({
  ImageService: {
    getInstance: () => ({ getImageUrls: () => [{ size: 'thumb', url: 'http://img/signed' }] }),
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
    const res = mapProfileImagesToOwner([{ image, isRestricted: false }])
    expect(res[0]).toHaveProperty('variants')
    expect(res[0].variants[0]).toEqual({ size: 'thumb', url: 'http://img/signed' })
  })

  it('exposes the sorted index as position, not the stored Image.position', () => {
    // Callers pass gallery images already ordered by ImageAttachment.position.
    const res = mapProfileImagesToOwner([
      { image: { ...image, id: 'ckaaaaaaaaaaaaaac', position: 9 }, isRestricted: false },
      { image: { ...image, id: 'ckaaaaaaaaaaaaaad', position: 9 }, isRestricted: false },
    ])
    expect(res.map((i) => i.position)).toEqual([0, 1])
  })

  it('gives the owner the whole gallery in stored order with the restriction flag', () => {
    const res = mapProfileImagesToOwner([
      { image: { ...image, id: 'ckaaaaaaaaaaaaaac' }, isRestricted: true },
      { image: { ...image, id: 'ckaaaaaaaaaaaaaad' }, isRestricted: false },
    ])
    expect(res.map((i) => [i.id, i.isRestricted, i.position])).toEqual([
      ['ckaaaaaaaaaaaaaac', true, 0],
      ['ckaaaaaaaaaaaaaad', false, 1],
    ])
  })

  describe('visibleProfileImages', () => {
    const e = (id: string, isRestricted: boolean) => ({ id, isRestricted })
    const ids = (list: { id: string }[]) => list.map((x) => x.id)

    it('drops restricted images for a viewer who may not see them', () => {
      expect(
        ids(visibleProfileImages([e('r1', true), e('a', false), e('b', false)], false))
      ).toEqual(['a', 'b'])
    })

    it("keeps the owner's order for an eligible viewer, restricted first photo included", () => {
      const gallery = [e('r1', true), e('a', false), e('r2', true), e('b', false)]
      expect(ids(visibleProfileImages(gallery, true))).toEqual(['r1', 'a', 'r2', 'b'])
    })

    it('returns nothing to an ineligible viewer when every image is restricted', () => {
      expect(visibleProfileImages([e('r1', true), e('r2', true)], false)).toEqual([])
      expect(ids(visibleProfileImages([e('r1', true), e('r2', true)], true))).toEqual(['r1', 'r2'])
    })
  })

  it('mapProfileImagesToPublic re-indexes positions after filtering', () => {
    const res = mapProfileImagesToPublic(
      [
        { image: { ...image, storagePath: 'restricted' }, isRestricted: true },
        { image: { ...image, storagePath: 'public' }, isRestricted: false },
      ],
      false
    )
    expect(res).toHaveLength(1)
    expect(res[0].position).toBe(0)
  })

  it('keeps Image.position when no index is given (message images)', () => {
    expect(toPublicImage({ ...image, position: 3 }).position).toBe(3)
    expect(toPublicImage({ ...image, position: 3 }, 0).position).toBe(0)
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

      const result = mapProfileToPublic(profileWithEmptyPreferredLocale, true, 'de', true)

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

      const result = mapProfileToPublic(profileWithNonEmptyPreferredLocale, true, 'de', true)

      // Should use German values since they are not empty
      expect(result.introSocial).toBe('Hallo Welt')
      expect(result.introDating).toBe('Suche nach Liebe')
    })

    describe('restricted images', () => {
      const gallery = [
        { image: { ...image, blurhash: 'restricted' }, isRestricted: true },
        { image: { ...image, blurhash: 'public' }, isRestricted: false },
      ]

      it('leaves restricted images out without the dating context', () => {
        const result = mapProfileToPublic(
          { ...baseProfile, profileImages: gallery },
          false,
          'en',
          false
        )
        expect(result.profileImages.map((i) => i.blurhash)).toEqual(['public'])
      })

      it("includes them in the owner's order with the dating context", () => {
        const result = mapProfileToPublic(
          { ...baseProfile, profileImages: gallery },
          true,
          'en',
          true
        )
        expect(result.profileImages.map((i) => i.blurhash)).toEqual(['restricted', 'public'])
        expect(result.profileImages.map((i) => i.position)).toEqual([0, 1])
      })

      it('grants restricted photos independently of the dating context', () => {
        const result = mapProfileToPublic(
          { ...baseProfile, profileImages: gallery },
          false,
          'en',
          true
        )
        expect(result.isDatingActive).toBe(false)
        expect(result.profileImages.map((i) => i.blurhash)).toEqual(['restricted', 'public'])
      })

      it('does not tell any viewer which images are restricted', () => {
        for (const dating of [true, false]) {
          const result = mapProfileToPublic(
            { ...baseProfile, profileImages: gallery },
            dating,
            'en',
            dating
          )
          for (const img of result.profileImages) expect(img).not.toHaveProperty('isRestricted')
        }
      })
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

      const result = mapProfileToPublic(profileWithAllEmptyValues, true, 'de', true)

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

      const result = mapProfileToPublic(profileWithWhitespaceValues, true, 'de', true)

      // Should fallback to English values since German values are only whitespace
      expect(result.introSocial).toBe('Hello world')
      expect(result.introDating).toBe('Looking for love')
    })

    it('should return empty string when no localized entries exist', () => {
      const profileWithNoLocalizedEntries = {
        ...baseProfile,
        localized: [],
      }

      const result = mapProfileToPublic(profileWithNoLocalizedEntries, true, 'de', true)

      expect(result.introSocial).toBe('')
      expect(result.introDating).toBe('')
    })
  })

  describe('DbTagToPublicTagTransform', () => {
    const tagBase: any = {
      id: 'tag1',
      slug: 'composting',
      translations: [
        { locale: 'en', name: 'Composting' },
        { locale: 'nl', name: 'Composteren' },
      ],
    }

    it('returns translation for the requested locale', () => {
      expect(DbTagToPublicTagTransform(tagBase, 'nl').name).toBe('Composteren')
    })

    it('falls back to English when requested locale has no translation', () => {
      expect(DbTagToPublicTagTransform(tagBase, 'bg').name).toBe('Composting')
    })

    it('falls back to any non-empty translation when neither requested locale nor English exist', () => {
      const tagNoEn: any = {
        id: 'tag2',
        slug: 'kert',
        translations: [{ locale: 'hu', name: 'Kert' }],
      }
      expect(DbTagToPublicTagTransform(tagNoEn, 'bg').name).toBe('Kert')
    })

    it('returns empty string when tag has no translations', () => {
      const tagEmpty: any = { id: 'tag3', slug: 'unknown', translations: [] }
      expect(DbTagToPublicTagTransform(tagEmpty, 'en').name).toBe('')
    })
  })
})
