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
} as unknown as UserContentMetadataRow

describe('mapUserContentMetadata', () => {
  it('isOwn=true when viewer is poster', () => {
    const dto = mapUserContentMetadata(baseRow, 'clprofile000000000001')
    expect(dto.isOwn).toBe(true)
    expect(dto.kind).toBe('post')
  })

  it('isOwn=false when viewer is not poster', () => {
    const dto = mapUserContentMetadata(baseRow, 'someone-else')
    expect(dto.isOwn).toBe(false)
  })

  it('extracts location object', () => {
    const dto = mapUserContentMetadata(baseRow, 'clprofile000000000001')
    expect(dto.location).toEqual({
      country: 'CZ',
      cityName: 'Prague',
      lat: 50.0,
      lon: 14.0,
    })
  })
})
