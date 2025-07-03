import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgresql://appuser:secret@localhost:5432/app_test'
process.env.NODE_ENV = 'test'

import { prisma } from '../../lib/prisma'
import { MatchQueryService } from '../../services/matchQuery.service'

let service: MatchQueryService

beforeAll(async () => {
  service = MatchQueryService.getInstance()
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.$transaction([
    prisma.profileImage.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ])
})

describe('MatchQueryService.findSocialProfilesFor', () => {
  it('returns only active profiles excluding the current one', async () => {
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
        { id: 'u2', email: 'u2@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
        { id: 'u3', email: 'u3@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
        { id: 'u4', email: 'u4@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
      ],
    })
    await prisma.profile.create({
      data: {
        id: 'p1',
        userId: 'u1',
        publicName: 'p1',
        country: 'US',
        cityName: '',
        isActive: true,
        isSocialActive: true,
      },
    })
    await prisma.profile.create({
      data: {
        id: 'p2',
        userId: 'u2',
        publicName: 'p2',
        country: 'US',
        cityName: '',
        isActive: true,
        isSocialActive: true,
      },
    })
    await prisma.profile.create({
      data: {
        id: 'p3',
        userId: 'u3',
        publicName: 'p3',
        country: 'US',
        cityName: '',
        isActive: false,
        isSocialActive: true,
      },
    })
    await prisma.profile.create({
      data: {
        id: 'p4',
        userId: 'u4',
        publicName: 'p4',
        country: 'US',
        cityName: '',
        isActive: true,
        isSocialActive: false,
      },
    })
    const res = await service.findSocialProfilesFor('p1')
    expect(res.map(p => p.id)).toEqual(['p2'])
  })
})

describe('MatchQueryService.findMutualMatchesFor', () => {
  it('returns empty array when profile is missing', async () => {
    const res = await service.findMutualMatchesFor('unknown')
    expect(res).toEqual([])
  })

  it('returns empty array when profile lacks data', async () => {
    await prisma.user.create({
      data: { id: 'u1', email: 'u1@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
    })
    await prisma.profile.create({
      data: { id: 'p1', userId: 'u1', publicName: 'p1', country: 'US', cityName: '', isDatingActive: false },
    })
    const res = await service.findMutualMatchesFor('p1')
    expect(res).toEqual([])
  })

  it('returns mutual matches including prefKids when set', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    await prisma.user.createMany({
      data: [
        { id: 'u1', email: 'u1@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
        { id: 'u2', email: 'u2@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
      ],
    })

    await prisma.profile.create({
      data: {
        id: 'p1',
        userId: 'u1',
        publicName: 'p1',
        country: 'US',
        cityName: '',
        birthday: new Date('1995-05-21'),
        gender: 'male',
        isDatingActive: true,
        isActive: true,
        prefAgeMin: 25,
        prefAgeMax: 35,
        prefGender: ['female'],
        prefKids: ['no'],
        hasKids: 'yes',
      },
    })

    await prisma.profile.create({
      data: {
        id: 'p2',
        userId: 'u2',
        publicName: 'p2',
        country: 'US',
        cityName: '',
        birthday: new Date('1993-01-01'),
        gender: 'female',
        isDatingActive: true,
        isActive: true,
        prefAgeMin: 28,
        prefAgeMax: 40,
        prefGender: ['male'],
        prefKids: ['yes', 'no'],
        hasKids: 'no',
      },
    })

    const res = await service.findMutualMatchesFor('p1')
    expect(res.map(p => p.id)).toEqual(['p2'])
  })

  it('omits prefKids filter when profile.hasKids is null', async () => {
    vi.setSystemTime(new Date('2024-05-20'))
    await prisma.user.createMany({
      data: [
        { id: 'u3', email: 'u3@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
        { id: 'u4', email: 'u4@test', isRegistrationConfirmed: true, hasActiveProfile: true, isActive: true, isOnboarded: true },
      ],
    })

    await prisma.profile.create({
      data: {
        id: 'p3',
        userId: 'u3',
        publicName: 'p3',
        country: 'US',
        cityName: '',
        birthday: new Date('1990-01-01'),
        gender: 'female',
        isDatingActive: true,
        isActive: true,
        prefAgeMin: 20,
        prefAgeMax: 30,
        prefGender: ['male'],
        prefKids: ['yes', 'no'],
        hasKids: null,
      },
    })

    await prisma.profile.create({
      data: {
        id: 'p4',
        userId: 'u4',
        publicName: 'p4',
        country: 'US',
        cityName: '',
        birthday: new Date('1995-01-01'),
        gender: 'male',
        isDatingActive: true,
        isActive: true,
        prefAgeMin: 20,
        prefAgeMax: 35,
        prefGender: ['female'],
        prefKids: ['no'],
        hasKids: 'no',
      },
    })

    const res = await service.findMutualMatchesFor('p3')
    expect(res.map(p => p.id)).toEqual(['p4'])
  })
})
