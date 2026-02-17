import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/mappers/image.mappers', () => ({
  toPublicProfileImage: (img: any) => ({ id: img.id, hash: img.hash, variants: {} }),
  toOwnerProfileImage: (img: any) => ({ id: img.id, hash: img.hash, variants: {} }),
}))

import { mapToLocalizedUpserts, mapProfileSummary } from '../../api/mappers/profile.mappers'

describe('mapToLocalizedUpserts', () => {
  it('groups localized fields by locale', () => {
    const result = mapToLocalizedUpserts('p1', {
      introSocialLocalized: { en: 'hello', de: 'hallo' },
      introDatingLocalized: { en: 'dating hello', de: 'dating hallo' },
    })

    expect(result).toHaveLength(2)
    const en = result.find(r => r.locale === 'en')!
    const de = result.find(r => r.locale === 'de')!

    expect(en.updates).toEqual({ introSocial: 'hello', introDating: 'dating hello' })
    expect(de.updates).toEqual({ introSocial: 'hallo', introDating: 'dating hallo' })
  })

  it('handles only introSocialLocalized', () => {
    const result = mapToLocalizedUpserts('p1', {
      introSocialLocalized: { fr: 'bonjour' },
    })

    expect(result).toEqual([{ locale: 'fr', updates: { introSocial: 'bonjour' } }])
  })

  it('handles only introDatingLocalized', () => {
    const result = mapToLocalizedUpserts('p1', {
      introDatingLocalized: { es: 'hola' },
    })

    expect(result).toEqual([{ locale: 'es', updates: { introDating: 'hola' } }])
  })

  it('returns empty array when no localized fields', () => {
    const result = mapToLocalizedUpserts('p1', {})
    expect(result).toEqual([])
  })

  it('handles undefined fields', () => {
    const result = mapToLocalizedUpserts('p1', {
      introSocialLocalized: undefined,
      introDatingLocalized: undefined,
    })
    expect(result).toEqual([])
  })
})

describe('mapProfileSummary', () => {
  it('maps a profile summary with images', () => {
    const profile = {
      id: 'p1',
      publicName: 'Alice',
      profileImages: [{ id: 'img1', hash: 'abc', position: 0, format: 'webp', status: 'APPROVED' }],
    }

    const result = mapProfileSummary(profile as any)
    expect(result.id).toBe('p1')
    expect(result.publicName).toBe('Alice')
    expect(result.profileImages).toHaveLength(1)
    expect(result.profileImages[0]).toHaveProperty('id', 'img1')
  })

  it('handles empty images array', () => {
    const profile = {
      id: 'p2',
      publicName: 'Bob',
      profileImages: [],
    }

    const result = mapProfileSummary(profile as any)
    expect(result.profileImages).toEqual([])
  })
})
