import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/profileFilter.service')
  ;(module.ProfileFilterService as any).instance = undefined
  service = module.ProfileFilterService.getInstance()
})

describe('ProfileFilterService.findSocialProfilesFor', () => {
  it('queries active profiles excluding given id', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p2' }])
    const res = await service.findSocialProfilesFor('p1')
  
    expect(res[0].id).toBe('p2')
  })
})

describe('ProfileFilterService.findMutualMatchesFor', () => {
  it('returns empty array when profile is missing', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)
    const res = await service.findMutualMatchesFor('p1')
    expect(res).toEqual([])
    expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
  })

  it('returns empty array when profile lacks data', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({ id: 'p1', isDatingActive: false })
    const res = await service.findMutualMatchesFor('p1')
    expect(res).toEqual([])
    expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
  })

  it('returns empty array when dating filter is missing', async () => {
    const profile = {
      id: 'p1',
      birthday: new Date('1995-05-21'),
      gender: 'male',
      isDatingActive: true,
    }
    mockPrisma.profile.findUnique.mockResolvedValue(profile)
    mockPrisma.datingFilter.findUnique.mockResolvedValue(null)
    const res = await service.findMutualMatchesFor('p1')
    expect(res).toEqual([])
    expect(mockPrisma.profile.findMany).not.toHaveBeenCalled()
  })

  it('queries for mutual matches including prefKids when set', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    const profile = {
      id: 'p1',
      birthday: new Date('1995-05-21'),
      gender: 'male',
      isDatingActive: true,
      hasKids: 'yes' as const,
    }
    const datingFilter = {
      id: 'df1',
      profileId: 'p1',
      prefAgeMin: 25,
      prefAgeMax: 35,
      prefGender: ['female'],
      prefKids: ['no'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.profile.findUnique.mockResolvedValue(profile)
    mockPrisma.datingFilter.findUnique.mockResolvedValue(datingFilter)
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p2' }])
    const res = await service.findMutualMatchesFor('p1')

    const today = new Date('2024-05-20')
    const gte = new Date(today)
    gte.setFullYear(gte.getFullYear() - 36)
    const lte = new Date(today)
    lte.setFullYear(lte.getFullYear() - 24)
    const age = 28

    expect(res[0].id).toBe('p2')
  })

  it('omits prefKids when profile.hasKids is null', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    const profile = {
      id: 'p1',
      birthday: new Date('1990-01-01'),
      gender: 'female',
      isDatingActive: true,
      hasKids: null,
    }
    const datingFilter = {
      id: 'df1',
      profileId: 'p1',
      prefAgeMin: 20,
      prefAgeMax: 30,
      prefGender: ['male'],
      prefKids: ['yes'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.profile.findUnique.mockResolvedValue(profile)
    mockPrisma.datingFilter.findUnique.mockResolvedValue(datingFilter)
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p3' }])
    await service.findMutualMatchesFor('p1')
    const age = 34
    const gte = new Date('2024-05-20')
    gte.setFullYear(gte.getFullYear() - 31)
    const lte = new Date('2024-05-20')
    lte.setFullYear(lte.getFullYear() - 19)
    
  })
})
