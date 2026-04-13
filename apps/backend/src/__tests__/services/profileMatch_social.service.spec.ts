import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
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
]

describe('ProfileMatchService.findSocialProfilesWithLocation', () => {
  it('requires lat and lon to be non-null', async () => {
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

  it('omits the tag filter when tagIds is empty', async () => {
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty('tags')
  })

  it('applies tag filter when tagIds are provided', async () => {
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId, ['tag-1'])

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { id: { in: ['tag-1'] } } },
        }),
      })
    )
  })

  it('does NOT exclude the viewer profile (frontend empty-state relies on it being present)', async () => {
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.where).not.toHaveProperty('id')
  })

  it('limits results to 500', async () => {
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)

    await service.findSocialProfilesWithLocation(mockProfileId)

    const call = mockPrisma.profile.findMany.mock.calls[0][0]
    expect(call.take).toBe(500)
  })
})
