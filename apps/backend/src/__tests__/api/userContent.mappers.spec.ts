import { describe, it, expect, vi } from 'vitest'

vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: (profile: any) => ({
    id: profile.id,
    publicName: profile.publicName,
    profileImages: (profile.profileImages ?? []).map((g: any) => g.image),
    location: profile.location ?? { country: '' },
  }),
}))

vi.mock('../../api/mappers/image.mappers', () => ({
  toPublicImage: (img: any) => ({
    mimeType: img.mimeType,
    altText: img.altText,
    position: img.position,
    blurhash: img.blurhash,
    variants: [],
  }),
  toOwnerImage: (img: any) => ({
    id: img.id,
    mimeType: img.mimeType,
    altText: img.altText,
    position: img.position,
    blurhash: img.blurhash,
    variants: [],
  }),
}))

import { mapUserContentMetadata } from '../../api/mappers/userContent.mappers'
import type { UserContentMetadataRow } from '@/services/userContent.service'

/**
 * Mappers take a MapperContext rather than a bare viewer id — two adjacent
 * string parameters would let a transposition through the type checker.
 */
const ctx = (viewerProfileId: string, locale = 'en') => ({ viewerProfileId, locale })

const baseRow = {
  id: 'cuc00000000000000001',
  kind: 'post' as const,
  postedById: 'clprofile000000000001',
  content: 'hello',
  isDeleted: false,
  isVisible: true,
  country: 'CZ',
  cityName: 'Prague',
  lat: 50.0,
  lon: 14.0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  postedBy: {
    id: 'clprofile000000000001',
    publicName: 'X',
    profileImages: [],
  },
  images: [],
  tags: [],
} as unknown as UserContentMetadataRow

describe('mapUserContentMetadata', () => {
  it('isOwn=true when viewer is poster', () => {
    const dto = mapUserContentMetadata(baseRow, ctx('clprofile000000000001'))
    expect(dto.isOwn).toBe(true)
    expect(dto.kind).toBe('post')
  })

  it('isOwn=false when viewer is not poster', () => {
    const dto = mapUserContentMetadata(baseRow, ctx('someone-else'))
    expect(dto.isOwn).toBe(false)
  })

  it('extracts location object', () => {
    const dto = mapUserContentMetadata(baseRow, ctx('clprofile000000000001'))
    expect(dto.location).toEqual({
      country: 'CZ',
      cityName: 'Prague',
      lat: 50.0,
      lon: 14.0,
    })
  })
})

/**
 * The mapper resolves each tag to a single name for the session locale.
 * `DbTagToPublicTagTransform` falls back locale → en → any other translation,
 * which is why the read include loads every translation rather than filtering
 * to the session locale in SQL.
 */
describe('mapUserContentMetadata tags', () => {
  // Mirrors what the read include loads: the full Tag row plus its translations.
  const tagRow = {
    id: 'cltag00000000000000001',
    slug: 'farm-stay',
    name: 'Farm stay',
    originalLocale: 'en',
    isUserCreated: false,
    isApproved: true,
    isHidden: false,
    isDeleted: false,
    createdBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }

  const rowWithTags = {
    ...baseRow,
    tags: [
      {
        ...tagRow,
        translations: [
          { locale: 'en', name: 'Farm stay' },
          { locale: 'hu', name: 'Tanyasi szállás' },
        ],
      },
    ],
  } as unknown as UserContentMetadataRow

  it('resolves tag names in the session locale', () => {
    const dto = mapUserContentMetadata(rowWithTags, ctx('viewer', 'hu'))
    expect(dto.tags).toEqual([
      { id: 'cltag00000000000000001', slug: 'farm-stay', name: 'Tanyasi szállás' },
    ])
  })

  it('falls back to English when the session locale has no translation', () => {
    const dto = mapUserContentMetadata(rowWithTags, ctx('viewer', 'de'))
    expect(dto.tags[0]?.name).toBe('Farm stay')
  })

  it('falls back to any translation when neither the locale nor English exists', () => {
    const onlyHu = {
      ...rowWithTags,
      tags: [{ ...tagRow, translations: [{ locale: 'hu', name: 'Tanyasi szállás' }] }],
    } as unknown as UserContentMetadataRow

    const dto = mapUserContentMetadata(onlyHu, ctx('viewer', 'de'))
    expect(dto.tags[0]?.name).toBe('Tanyasi szállás')
  })

  it('returns an empty array for untagged content', () => {
    const dto = mapUserContentMetadata(baseRow, ctx('viewer', 'en'))
    expect(dto.tags).toEqual([])
  })
})
