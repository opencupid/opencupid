import { describe, it, expect, vi, beforeEach } from 'vitest'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { tagsInclude } from '@/db/includes/profileIncludes'
import { profileImageInclude } from '@/db/includes/profileIncludes'

import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any
let mockTx: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  mockTx = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/profileMatch.service')
  ;(module.ProfileMatchService as any).instance = undefined
  service = module.ProfileMatchService.getInstance()
})

vi.mock('@/db/includes/blocklistWhereClause', () => ({
  blocklistWhereClause: vi.fn(() => ({})),
}))
vi.mock('@/db/includes/profileIncludes', () => ({
  tagsInclude: vi.fn(() => ({ tags: true })),
  profileImageInclude: vi.fn(() => ({ images: true })),
}))

const mockProfileId = 'profile-123'

const mockProfiles = [
  { id: 'profile-2', isActive: true, isSocialActive: true },
  { id: 'profile-3', isActive: true, isSocialActive: true },
  { id: 'profile-4', isActive: true, isSocialActive: true, country: 'US' },
  { id: 'profile-5', isActive: true, isSocialActive: true, country: 'US' },
  { id: 'profile-6', isActive: true, isSocialActive: true, tags: [{ id: 'tag-1' }] },
  { id: 'profile-7', isActive: true, isSocialActive: true, country: 'US', tags: [{ id: 'tag-2' }] },
]

describe('ProfileMatchService.findSocialProfilesFor', () => {
  it('returns empty array if no user preferences found', async () => {
    ;(mockPrisma.socialMatchFilter.findUnique as any).mockResolvedValue(null)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toEqual([])
  })

  it('no location and tag filters', async () => {
    const mockUserPrefs = {
      profileId: mockProfileId,
    }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toBe(mockProfiles)
  })

  it('country filter', async () => {
    const mockUserPrefs = {
      profileId: mockProfileId,
      country: 'US',
    }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toBe(mockProfiles)
  })

  it('tag filter', async () => {
    const mockUserPrefs = {
      profileId: mockProfileId,
      tags: [{ id: 'tag-1' }, { id: 'tag-2' }],
    }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toBe(mockProfiles)
  })
})

describe('ProfileMatchService.findSocialProfilesWithLocation', () => {
  it('returns empty array if no user preferences found', async () => {
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(null)
    const result = await service.findSocialProfilesWithLocation(mockProfileId)
    expect(result).toEqual([])
  })

  it('requires lat and lon to be non-null in the where clause', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lat: { not: null },
          lon: { not: null },
        }),
      })
    )
  })

  it('applies country filter from user preferences', async () => {
    const mockUserPrefs = { profileId: mockProfileId, country: 'HU' }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          country: 'HU',
          lat: { not: null },
          lon: { not: null },
        }),
      })
    )
  })

  it('applies tag filter from user preferences', async () => {
    const mockUserPrefs = { profileId: mockProfileId, tags: [{ id: 'tag-1' }] }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { id: { in: ['tag-1'] } } },
        }),
      })
    )
  })

  it('applies bounding box when provided', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    const bounds = { south: 45.0, north: 48.0, west: 16.0, east: 23.0 }
    await service.findSocialProfilesWithLocation(mockProfileId, undefined, bounds)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lat: { not: null, gte: 45.0, lte: 48.0 },
          lon: { not: null, gte: 16.0, lte: 23.0 },
        }),
      })
    )
  })

  it('has no skip/take when no bounds provided', async () => {
    const mockUserPrefs = { profileId: mockProfileId }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.take).toBe(500)
    expect(call).not.toHaveProperty('skip')
  })
})

describe('ProfileMatchService.createSocialMatchFilter', () => {
  it('creates filter with full location data', async () => {
    const createdFilter = { profileId: mockProfileId, country: 'US', tags: [] }
    mockTx.socialMatchFilter.create.mockResolvedValue(createdFilter)

    const result = await service.createSocialMatchFilter(mockTx, mockProfileId, {
      country: 'US',
      cityName: 'New York',
      lat: 40.7,
      lon: -74.0,
    })

    expect(mockTx.socialMatchFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          profileId: mockProfileId,
          country: 'US',
          cityName: 'New York',
          lat: 40.7,
          lon: -74.0,
        },
      })
    )
    expect(result).toBe(createdFilter)
  })
})
