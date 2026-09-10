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

import { mapDbEventToPublic, mapDbEventToOwner } from '../../api/mappers/event.mappers'

/**
 * Mappers take a MapperContext rather than a bare viewer id — two adjacent
 * string parameters would let a transposition through the type checker.
 */
const ctx = (viewerProfileId: string, locale = 'en') => ({ viewerProfileId, locale })

const baseImages = [
  {
    image: {
      id: 'climg00000000000000001',
      mimeType: 'image/jpeg',
      altText: 'first',
      position: 0,
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      storagePath: '/x',
    },
  },
  {
    image: {
      id: 'climg00000000000000002',
      mimeType: 'image/jpeg',
      altText: 'second',
      position: 1,
      blurhash: null,
      storagePath: '/y',
    },
  },
]

const baseDbEvent: any = {
  id: 'cuevent00000000000001',
  kind: 'event',
  content: 'Test event content',
  isDeleted: false,
  isVisible: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  postedById: 'clprofile000000000001',
  country: 'AT',
  cityName: 'Vienna',
  lat: 48.2,
  lon: 16.3,
  postedBy: {
    id: 'clprofile000000000001',
    publicName: 'Test User',
    profileImages: [],
  },
  event: {
    userContentId: 'cuevent00000000000001',
    startsAt: new Date('2027-06-01T18:00:00Z'),
    venue: null,
  },
  images: baseImages,
  tags: [],
}

describe('mapDbEventToPublic', () => {
  it('maps an event with location and startsAt', () => {
    const result = mapDbEventToPublic(baseDbEvent, ctx('viewer-profile-id'))
    expect(result.id).toBe(baseDbEvent.id)
    expect(result.kind).toBe('event')
    expect(result.content).toBe(baseDbEvent.content)
    expect(result.startsAt.toISOString()).toBe('2027-06-01T18:00:00.000Z')
    expect(result.isOwn).toBe(false)
    expect(result.location).toEqual({ country: 'AT', cityName: 'Vienna', lat: 48.2, lon: 16.3 })
  })

  it('isOwn=true when viewer is poster', () => {
    const result = mapDbEventToPublic(baseDbEvent, ctx('clprofile000000000001'))
    expect(result.isOwn).toBe(true)
  })
})

describe('mapDbEventToOwner', () => {
  it('parses through OwnerEventSchema', () => {
    const result = mapDbEventToOwner(baseDbEvent, ctx('owner'))
    expect(result.kind).toBe('event')
    expect(result.isOwn).toBe(true)
    expect(result.startsAt.toISOString()).toBe('2027-06-01T18:00:00.000Z')
    expect(result.isVisible).toBe(true)
  })
})

describe('mapDbEventToPublic images', () => {
  it('projects attached images in PublicEvent shape (no id)', () => {
    const result = mapDbEventToPublic(baseDbEvent, ctx('viewer-profile-id'))
    expect(result.images).toHaveLength(2)
    expect(result.images[0]).toEqual({
      mimeType: 'image/jpeg',
      altText: 'first',
      position: 0,
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      variants: [],
    })
    expect((result.images[0] as any).id).toBeUndefined()
  })

  it('returns empty images array when content has none', () => {
    const result = mapDbEventToPublic({ ...baseDbEvent, images: [] }, ctx('viewer-profile-id'))
    expect(result.images).toEqual([])
  })
})

describe('mapDbEventToOwner images', () => {
  it('projects attached images in OwnerEvent shape (with id)', () => {
    const result = mapDbEventToOwner(baseDbEvent, ctx('owner'))
    expect(result.images).toHaveLength(2)
    expect(result.images[0]?.id).toBe('climg00000000000000001')
  })
})
