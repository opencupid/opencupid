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

describe('ProfileMatchService.createSocialMatchFilter', () => {
  const createdFilter = { profileId: mockProfileId, country: 'US', tags: [] }

  it('keeps country when other members exist in the same country', async () => {
    mockTx.profile.count.mockResolvedValue(3)
    mockTx.socialMatchFilter.create.mockResolvedValue(createdFilter)

    const result = await service.createSocialMatchFilter(mockTx, mockProfileId, {
      country: 'US',
      cityName: 'New York',
      lat: 40.7,
      lon: -74.0,
    })

    expect(mockTx.profile.count).toHaveBeenCalledWith({
      where: {
        country: 'US',
        isSocialActive: true,
        isOnboarded: true,
        isActive: true,
        id: { not: mockProfileId },
      },
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

  it('sets country to empty when no other members in the same country', async () => {
    const anywhereFilter = { profileId: mockProfileId, country: '', tags: [] }
    mockTx.profile.count.mockResolvedValue(0)
    mockTx.socialMatchFilter.create.mockResolvedValue(anywhereFilter)

    const result = await service.createSocialMatchFilter(mockTx, mockProfileId, {
      country: 'US',
      cityName: 'New York',
      lat: 40.7,
      lon: -74.0,
    })

    expect(mockTx.profile.count).toHaveBeenCalledWith({
      where: {
        country: 'US',
        isSocialActive: true,
        isOnboarded: true,
        isActive: true,
        id: { not: mockProfileId },
      },
    })
    expect(mockTx.socialMatchFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          profileId: mockProfileId,
          country: '',
          cityName: 'New York',
          lat: 40.7,
          lon: -74.0,
        },
      })
    )
    expect(result).toBe(anywhereFilter)
  })

  it('skips count query when country is empty', async () => {
    const anywhereFilter = { profileId: mockProfileId, country: '', tags: [] }
    mockTx.socialMatchFilter.create.mockResolvedValue(anywhereFilter)

    await service.createSocialMatchFilter(mockTx, mockProfileId, {
      country: '',
      cityName: null,
      lat: null,
      lon: null,
    })

    expect(mockTx.profile.count).not.toHaveBeenCalled()
    expect(mockTx.socialMatchFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          profileId: mockProfileId,
          country: '',
          cityName: null,
          lat: null,
          lon: null,
        },
      })
    )
  })
})
