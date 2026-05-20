import { describe, it, expect, vi } from 'vitest'

// Mock the profile mappers dependency (avoids ImageService/signing complexity)
vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: (profile: any) => ({
    id: profile.id,
    publicName: profile.publicName,
    profileImages: (profile.profileImages ?? []).map((g: any) => g.image),
    location: profile.location ?? { country: '' },
  }),
}))

// Mock image.mappers to avoid ImageService URL-signing dependency
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

import { mapDbPostToPublic, mapDbPostToOwner } from '../../api/mappers/post.mappers'

const basePostedBy = {
  id: 'clprofile000000000001',
  publicName: 'Test User',
  profileImages: [],
}

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

const baseDbPost: any = {
  id: 'clpost00000000000001',
  kind: 'post',
  content: 'Test post content',
  isDeleted: false,
  isVisible: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  postedById: 'clprofile000000000001',
  country: 'AT',
  cityName: 'Vienna',
  lat: 48.2,
  lon: 16.3,
  postedBy: basePostedBy,
  post: {
    userContentId: 'clpost00000000000001',
    type: 'OFFER',
  },
  images: baseImages,
}

describe('mapDbPostToPublic', () => {
  it('maps a post with location', () => {
    const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')

    expect(result.id).toBe(baseDbPost.id)
    expect(result.content).toBe(baseDbPost.content)
    expect(result.type).toBe(baseDbPost.post.type)
    expect(result.postedBy).toEqual({
      id: basePostedBy.id,
      publicName: basePostedBy.publicName,
      profileImages: [],
      location: { country: '' },
    })
    expect(result.location).toEqual({
      country: 'AT',
      cityName: 'Vienna',
      lat: 48.2,
      lon: 16.3,
    })
  })

  it('maps a post with location fields', () => {
    const postWithLocation = {
      ...baseDbPost,
      country: 'DE',
      cityName: 'Berlin',
      lat: 52.52,
      lon: 13.405,
    }

    const result = mapDbPostToPublic(postWithLocation, 'viewer-profile-id')

    expect(result.location).toEqual({
      country: 'DE',
      cityName: 'Berlin',
      lat: 52.52,
      lon: 13.405,
    })
  })

  it('strips owner-only fields (isDeleted, isVisible)', () => {
    const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')

    expect(result).not.toHaveProperty('isDeleted')
    expect(result).not.toHaveProperty('isVisible')
  })

  it('includes standard public fields', () => {
    const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('kind', 'post')
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('type')
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('postedBy')
    expect(result).toHaveProperty('location')
  })
})

describe('mapDbPostToOwner', () => {
  it('includes owner fields (isDeleted, isVisible)', () => {
    const result = mapDbPostToOwner(baseDbPost)

    expect(result).toHaveProperty('isDeleted', false)
    expect(result).toHaveProperty('isVisible', true)
  })

  it('maps location for owner posts', () => {
    const postWithLocation = {
      ...baseDbPost,
      country: 'FR',
      cityName: 'Paris',
      lat: 48.8566,
      lon: 2.3522,
    }

    const result = mapDbPostToOwner(postWithLocation)

    expect(result.location).toEqual({
      country: 'FR',
      cityName: 'Paris',
      lat: 48.8566,
      lon: 2.3522,
    })
  })

  it('maps location from base post', () => {
    const result = mapDbPostToOwner(baseDbPost)

    expect(result.location).toEqual({
      country: 'AT',
      cityName: 'Vienna',
      lat: 48.2,
      lon: 16.3,
    })
  })
})

describe('mapDbPostToPublic images', () => {
  it('projects attached images in PublicPost shape (no id)', () => {
    const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')
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
    const result = mapDbPostToPublic({ ...baseDbPost, images: [] }, 'viewer-profile-id')
    expect(result.images).toEqual([])
  })
})

describe('mapDbPostToOwner images', () => {
  it('projects attached images in OwnerPost shape (with id)', () => {
    const result = mapDbPostToOwner(baseDbPost)
    expect(result.images).toHaveLength(2)
    expect(result.images[0]?.id).toBe('climg00000000000000001')
  })
})
