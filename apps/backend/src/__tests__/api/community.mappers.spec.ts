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

import {
  mapDbCommunityToPublic,
  mapDbCommunityToDetail,
  mapDbCommunityToOwner,
} from '../../api/mappers/community.mappers'

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

const basePostedBy = {
  id: 'clprofile000000000001',
  publicName: 'Test User',
  profileImages: [],
  conversationAsA: [],
  conversationAsB: [],
}

const baseDbCommunity: any = {
  id: 'cucomm00000000000001',
  kind: 'community',
  content: 'Test community content',
  isDeleted: false,
  isVisible: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  postedById: 'clprofile000000000001',
  country: 'AT',
  cityName: 'Vienna',
  lat: 48.2,
  lon: 16.3,
  postedBy: basePostedBy,
  community: {
    userContentId: 'cucomm00000000000001',
    yearFounded: 2010,
  },
  images: baseImages,
}

describe('mapDbCommunityToPublic', () => {
  it('maps a community with yearFounded and location', () => {
    const result = mapDbCommunityToPublic(baseDbCommunity, 'viewer-profile-id')
    expect(result.id).toBe(baseDbCommunity.id)
    expect(result.kind).toBe('community')
    expect(result.content).toBe(baseDbCommunity.content)
    expect(result.yearFounded).toBe(2010)
    expect(result.isOwn).toBe(false)
    expect(result.location).toEqual({ country: 'AT', cityName: 'Vienna', lat: 48.2, lon: 16.3 })
  })

  it('isOwn=true when viewer is poster', () => {
    const result = mapDbCommunityToPublic(baseDbCommunity, 'clprofile000000000001')
    expect(result.isOwn).toBe(true)
  })
})

describe('mapDbCommunityToDetail', () => {
  it('attaches conversation context on postedBy', () => {
    const result = mapDbCommunityToDetail(baseDbCommunity, 'viewer-profile-id')
    expect(result.postedBy).toHaveProperty('haveConversation')
    expect(result.postedBy).toHaveProperty('canMessage')
  })
})

describe('mapDbCommunityToOwner', () => {
  it('parses through OwnerCommunitySchema', () => {
    const result = mapDbCommunityToOwner(baseDbCommunity)
    expect(result.kind).toBe('community')
    expect(result.isOwn).toBe(true)
    expect(result.yearFounded).toBe(2010)
    expect(result.isVisible).toBe(true)
  })
})

describe('mapDbCommunityToPublic images', () => {
  it('projects attached images in PublicCommunity shape (no id)', () => {
    const result = mapDbCommunityToPublic(baseDbCommunity, 'viewer-profile-id')
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
    const result = mapDbCommunityToPublic({ ...baseDbCommunity, images: [] }, 'viewer-profile-id')
    expect(result.images).toEqual([])
  })
})

describe('mapDbCommunityToOwner images', () => {
  it('projects attached images in OwnerCommunity shape (with id)', () => {
    const result = mapDbCommunityToOwner(baseDbCommunity)
    expect(result.images).toHaveLength(2)
    expect(result.images[0]?.id).toBe('climg00000000000000001')
  })
})
