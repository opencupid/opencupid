import { describe, it, expect, vi } from 'vitest'

// Mock the profile mappers dependency (avoids ImageService/signing complexity)
vi.mock('../../api/mappers/profile.mappers', () => ({
  mapProfileSummary: (profile: any) => ({
    id: profile.id,
    publicName: profile.publicName,
    profileImages: profile.profileImages ?? [],
  }),
}))

import { mapDbPostToPublic, mapDbPostToOwner } from '../../api/mappers/post.mappers'

const basePostedBy = {
  id: 'clprofile000000000001',
  publicName: 'Test User',
  profileImages: [],
}

const baseDbPost: any = {
  id: 'clpost00000000000001',
  content: 'Test post content',
  type: 'OFFER',
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
}

describe('mapDbPostToPublic', () => {
  it('maps a post with location', () => {
    const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')

    expect(result.id).toBe(baseDbPost.id)
    expect(result.content).toBe(baseDbPost.content)
    expect(result.type).toBe(baseDbPost.type)
    expect(result.postedBy).toEqual({
      id: basePostedBy.id,
      publicName: basePostedBy.publicName,
      profileImages: [],
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
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('type')
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('updatedAt')
    expect(result).toHaveProperty('postedById')
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
