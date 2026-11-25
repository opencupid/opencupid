import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

const appConfig = vi.hoisted(() => ({ ADMIN_PROFILE_ID: 'gephaz' as string | undefined }))
vi.mock('@/lib/appconfig', () => ({ appConfig }))

let mockPrisma: any
let service: any
let ageBandsFor: any
let median: any

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-25'))
  appConfig.ADMIN_PROFILE_ID = 'gephaz'
  mockPrisma = createMockPrisma()
  vi.doMock('@/lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/statistics.service')
  service = module.StatisticsService.getInstance()
  ;({ ageBandsFor, median } = module)
  return () => vi.useRealTimers()
})

let nextId = 0
function person(overrides: Record<string, any> = {}) {
  return {
    id: `p${nextId++}`,
    isSocialActive: true,
    isDatingActive: true,
    isHiddenFromResults: false,
    birthday: new Date('1990-01-01'),
    gender: 'male',
    relationship: 'single',
    hasKids: 'no',
    prefAgeMin: 30,
    prefAgeMax: 40,
    prefGender: ['female'],
    prefKids: ['no', 'yes'],
    user: { originDomain: 'a.example' },
    activitySummary: { segment: 'frequent' },
    blockedProfiles: [] as { id: string }[],
    ...overrides,
  }
}
const man = (o = {}) => person(o)
const woman = (o = {}) => person({ gender: 'female', prefGender: ['male'], ...o })
const socialOnly = (o = {}) =>
  person({
    isDatingActive: false,
    birthday: null,
    gender: null,
    prefAgeMin: null,
    prefAgeMax: null,
    ...o,
  })

function stats(rows: unknown[], filter = {}) {
  mockPrisma.profile.findMany.mockResolvedValue(rows)
  return service.getStatistics(filter)
}

describe('median', () => {
  it('averages the two middle values of an even list', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('is null for an empty list', () => {
    expect(median([])).toBeNull()
  })
})

describe('ageBandsFor', () => {
  it('covers every age in contiguous 5-year bands', () => {
    expect(ageBandsFor([36, 24]).map((b: any) => b.band)).toEqual([
      '20–24',
      '25–29',
      '30–34',
      '35–39',
    ])
  })

  it('is empty without ages', () => {
    expect(ageBandsFor([])).toEqual([])
  })
})

describe('StatisticsService.getStatistics', () => {
  it('queries active members without the system sender', async () => {
    await stats([])
    expect(mockPrisma.profile.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      isOnboarded: true,
      user: { isBlocked: false },
      id: { not: 'gephaz' },
    })
  })

  it('does not filter by id when no system sender is configured', async () => {
    appConfig.ADMIN_PROFILE_ID = undefined
    await stats([])
    expect(mockPrisma.profile.findMany.mock.calls[0][0].where).not.toHaveProperty('id')
  })

  it('counts profiles and groups the dating population by gender and age', async () => {
    const res = await stats([
      man(),
      woman({ birthday: new Date('1980-01-01'), hasKids: 'yes', relationship: null }),
      person({ gender: 'agender', isHiddenFromResults: true }),
      socialOnly(),
    ])

    expect(res.profiles).toEqual({ total: 4, social: 4, dating: 3, hidden: 1 })
    expect(res.dating.gender).toEqual({ male: 1, female: 1, other: 1 })
    expect(res.dating.medianAge).toEqual({ all: 36, male: 36, female: 46 })
    expect(res.dating.ageBands[0]).toEqual({ band: '35–39', male: 1, female: 0, other: 1 })
    expect(res.dating.ageBands.at(-1)).toEqual({ band: '45–49', male: 0, female: 1, other: 0 })
    expect(res.dating.hasKids.find((r: any) => r.value === 'yes').female).toBe(1)
    expect(res.dating.relationship.find((r: any) => r.value === 'unspecified').female).toBe(1)
  })

  it('reports groups of any size', async () => {
    const res = await stats([man(), woman()])
    expect(res.pool.ageBands).toEqual([
      { band: '35–39', male: { count: 1, median: 1 }, female: { count: 1, median: 1 } },
    ])
  })

  it('counts only mutually compatible people as matches', async () => {
    const res = await stats([man(), woman(), woman({ prefAgeMin: 50, prefAgeMax: 60 })])
    expect(res.pool.ageBands[0].male.median).toBe(1)
    expect(res.pool.ageBands[0].female.median).toBe(0.5)
  })

  it('leaves hidden profiles out of the pool on both sides', async () => {
    const res = await stats([man(), woman({ isHiddenFromResults: true })])
    expect(res.pool.gender).toEqual({ male: 1, female: 0, other: 0 })
    expect(res.pool.ageBands[0].male.median).toBe(0)
    expect(res.dating.gender.female).toBe(1)
  })

  it('ignores pairs where either one blocked the other', async () => {
    const him = man()
    const res = await stats([him, woman({ blockedProfiles: [{ id: him.id }] })])
    expect(res.pool.ageBands[0].male.median).toBe(0)
    expect(res.pool.ageBands[0].female.median).toBe(0)
  })

  it('splits people by their number of matches', async () => {
    const res = await stats([man(), ...Array.from({ length: 6 }, () => woman())])
    expect(res.pool.fewMatches).toBe(6)
    expect(res.pool.distribution).toEqual([
      { range: '0–5', male: 0, female: 6, other: 0 },
      { range: '6–15', male: 1, female: 0, other: 0 },
      { range: '16–30', male: 0, female: 0, other: 0 },
      { range: '31+', male: 0, female: 0, other: 0 },
    ])
  })

  it('filters by brand and segment but keeps matching against the whole site', async () => {
    const rows = [
      man(),
      woman({ user: { originDomain: 'b.example' }, activitySummary: { segment: 'dormant' } }),
    ]
    const byOrigin = await stats(rows, { origin: 'a.example' })
    expect(byOrigin.origins).toEqual(['a.example', 'b.example'])
    expect(byOrigin.profiles.total).toBe(1)
    expect(byOrigin.pool.gender).toEqual({ male: 1, female: 0, other: 0 })
    expect(byOrigin.pool.ageBands[0].male.median).toBe(1)

    const bySegment = await stats(rows, { segment: 'dormant' })
    expect(bySegment.dating.gender).toEqual({ male: 0, female: 1, other: 0 })
  })
})
