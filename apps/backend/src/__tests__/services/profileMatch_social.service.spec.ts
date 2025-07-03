import { describe, it, expect, vi, beforeEach } from 'vitest'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { tagsInclude } from '@/db/includes/profileIncludes'
import { profileImageInclude } from '@/db/includes/profileIncludes'


import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/profileMatch.service')
    ; (module.ProfileMatchService as any).instance = undefined
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
  { id: 'profile-5', isActive: true, isSocialActive: true, country: 'US', cityId: 'city-1' },
  { id: 'profile-6', isActive: true, isSocialActive: true, tags: [{ id: 'tag-1' }] },
  { id: 'profile-7', isActive: true, isSocialActive: true, country: 'US', cityId: 'city-1', tags: [{ id: 'tag-2' }] },
]

describe('ProfileMatchService.findSocialProfilesFor', () => {

  it('returns empty array if no user preferences found', async () => {
    (mockPrisma.socialMatchFilter.findUnique as any).mockResolvedValue(null)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toEqual([])
    expect(mockPrisma.socialMatchFilter.findUnique).toHaveBeenCalledWith({
      where: { profileId: mockProfileId },
      include: { tags: { include: { translations: { select: { name: true, locale: true } } } } },
    })
  })

  it('no location and tag filters', async () => {
    const mockUserPrefs = {
      profileId: mockProfileId,
    }
    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toBe(mockProfiles)
    // expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
    //   where: {
    //     isActive: true,
    //     isSocialActive: true,
    //     id: { not: mockProfileId },
    //     ...blocklistWhereClause(mockProfileId),
    //   },
    //   include: {
    //     ...tagsInclude(),
    //     ...profileImageInclude(),
    //   },
    // })
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
    // expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
    //   where: {
    //     isActive: true,
    //     isSocialActive: true,
    //     id: { not: mockProfileId },
    //     country: 'US',
    //     ...blocklistWhereClause(mockProfileId),
    //   },
    //   include: {
    //     ...tagsInclude(),
    //     ...profileImageInclude(),
    //   },
    // })
  })

  it('country and city filters', async () => {

    const mockUserPrefs = {
      profileId: mockProfileId,
      country: 'US',
      cityId: 'city-1',
    }

    mockPrisma.socialMatchFilter.findUnique.mockResolvedValue(mockUserPrefs)
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    const result = await service.findSocialProfilesFor(mockProfileId)
    expect(result).toBe(mockProfiles)
    // expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
    //   where: {
    //     isActive: true,
    //     isSocialActive: true,
    //     id: { not: mockProfileId },
    //     country: 'US',
    //     cityId: 'city-1',
    //     ...blocklistWhereClause(mockProfileId),
    //   },
    //   include: {
    //     ...tagsInclude(),
    //     ...profileImageInclude(),
    //   },
    // })
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
    // expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
    //   where: {
    //     isActive: true,
    //     isSocialActive: true,
    //     id: { not: mockProfileId },
    //     tags: { some: { id: { in: ['tag-1', 'tag-2'] } } },
    //     ...blocklistWhereClause(mockProfileId),
    //   },
    //   include: {
    //     ...tagsInclude(),
    //     ...profileImageInclude(),
    //   },
    // })
  })


})