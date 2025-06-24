import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'
import { profileCompleteInclude } from '../../db/includes/profileCompleteInclude'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/matchQuery.service')
  ;(module.MatchQueryService as any).instance = undefined
  service = module.MatchQueryService.getInstance()
})

describe('MatchQueryService.findSocialProfilesFor', () => {
  it('queries active profiles excluding given id', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p2' }])
    const res = await service.findSocialProfilesFor('p1')
    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        isSocialActive: true,
        id: { not: 'p1' },
      },
      include: {
        ...profileCompleteInclude(),
      },
    })
    expect(res[0].id).toBe('p2')
  })
})

describe('MatchQueryService.findMutualMatchesFor', () => {
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

  it('queries for mutual matches including prefKids when set', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    const profile = {
      id: 'p1',
      birthday: new Date('1995-05-21'),
      gender: 'male',
      isDatingActive: true,
      prefAgeMin: 25,
      prefAgeMax: 35,
      prefGender: ['female'],
      prefKids: ['no'],
      hasKids: 'yes' as const,
    }
    mockPrisma.profile.findUnique.mockResolvedValue(profile)
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p2' }])
    const res = await service.findMutualMatchesFor('p1')

    const today = new Date('2024-05-20')
    const gte = new Date(today)
    gte.setFullYear(gte.getFullYear() - 35)
    const lte = new Date(today)
    lte.setFullYear(lte.getFullYear() - 25)
    const age = 28

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'p1' },
        isDatingActive: true,
        birthday: { gte, lte },
        gender: { in: profile.prefGender },
        hasKids: { in: profile.prefKids },
        prefAgeMin: { lte: age },
        prefAgeMax: { gte: age },
        prefGender: { hasSome: [profile.gender] },
        prefKids: { hasSome: [profile.hasKids] },
      },
      include: {
        ...profileCompleteInclude(),
      },
    })
    expect(res[0].id).toBe('p2')
  })

  it('omits prefKids when profile.hasKids is null', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    const profile = {
      id: 'p1',
      birthday: new Date('1990-01-01'),
      gender: 'female',
      isDatingActive: true,
      prefAgeMin: 20,
      prefAgeMax: 30,
      prefGender: ['male'],
      prefKids: ['yes'],
      hasKids: null,
    }
    mockPrisma.profile.findUnique.mockResolvedValue(profile)
    mockPrisma.profile.findMany.mockResolvedValue([{ id: 'p3' }])
    await service.findMutualMatchesFor('p1')
    const age = 34
    const gte = new Date('2024-05-20')
    gte.setFullYear(gte.getFullYear() - 30)
    const lte = new Date('2024-05-20')
    lte.setFullYear(lte.getFullYear() - 20)
    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'p1' },
        isDatingActive: true,
        birthday: { gte, lte },
        gender: { in: profile.prefGender },
        hasKids: { in: profile.prefKids },
        prefAgeMin: { lte: age },
        prefAgeMax: { gte: age },
        prefGender: { hasSome: [profile.gender] },
        prefKids: undefined,
      },
      include: {
        ...profileCompleteInclude(),
      },
    })
  })
})
