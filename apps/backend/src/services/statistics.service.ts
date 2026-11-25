import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import { calculateAge } from '@zod/match/filters.form'
import { DatingEligibleProfileSchema, type DatingEligibleProfile } from '@zod/profile/profile.db'
import { RelationshipStatusSchema } from '@zod/generated/inputTypeSchemas/RelationshipStatusSchema'
import { HasKidsSchema } from '@zod/generated/inputTypeSchemas/HasKidsSchema'
import {
  FEW_MATCHES_MAX,
  type AdminStatistics,
  type AdminStatisticsQuery,
  type GenderCounts,
} from '@zod/admin/statistics.dto'
import { areMutuallyCompatible, statusFlags } from './profileMatch.service'

const BAND_YEARS = 5

const MATCH_RANGES = [FEW_MATCHES_MAX, 15, 30, Infinity].map((max, i, maxes) => {
  const min = i === 0 ? 0 : maxes[i - 1]! + 1
  return { range: max === Infinity ? `${min}+` : `${min}–${max}`, min, max }
})

type GenderKey = keyof GenderCounts

function genderKey(gender: string | null): GenderKey {
  return gender === 'male' || gender === 'female' ? gender : 'other'
}

function countByGender(rows: { gender: string | null }[]): GenderCounts {
  const counts: GenderCounts = { male: 0, female: 0, other: 0 }
  for (const row of rows) counts[genderKey(row.gender)]++
  return counts
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** Contiguous 5-year bands covering every age given, youngest first. */
export function ageBandsFor(ages: number[]): { band: string; min: number; max: number }[] {
  if (ages.length === 0) return []
  const first = Math.floor(Math.min(...ages) / BAND_YEARS) * BAND_YEARS
  const last = Math.floor(Math.max(...ages) / BAND_YEARS) * BAND_YEARS
  const bands = []
  for (let min = first; min <= last; min += BAND_YEARS) {
    const max = min + BAND_YEARS - 1
    bands.push({ band: `${min}–${max}`, min, max })
  }
  return bands
}

/** Active members without the system sender, which isn't a person. */
function loadProfiles() {
  return prisma.profile.findMany({
    where: {
      ...statusFlags,
      ...(appConfig.ADMIN_PROFILE_ID ? { id: { not: appConfig.ADMIN_PROFILE_ID } } : {}),
    },
    select: {
      id: true,
      isSocialActive: true,
      isDatingActive: true,
      isHiddenFromResults: true,
      birthday: true,
      gender: true,
      relationship: true,
      hasKids: true,
      prefAgeMin: true,
      prefAgeMax: true,
      prefGender: true,
      prefKids: true,
      user: { select: { originDomain: true } },
      activitySummary: { select: { segment: true } },
      blockedProfiles: { select: { id: true } },
    },
  })
}

type StatisticsProfile = Awaited<ReturnType<typeof loadProfiles>>[number]

/** Composition of the member base, for the admin Statistics page. */
export class StatisticsService {
  private static instance: StatisticsService

  private constructor() {}

  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService()
    }
    return StatisticsService.instance
  }

  async getStatistics(filter: AdminStatisticsQuery): Promise<AdminStatistics> {
    const everyone = await loadProfiles()
    const profiles = everyone.filter(
      (p) =>
        (!filter.origin || p.user.originDomain === filter.origin) &&
        (!filter.segment || p.activitySummary?.segment === filter.segment)
    )
    const dating = profiles.filter((p) => p.isDatingActive)
    const withAge = dating.flatMap((p) =>
      p.birthday ? [{ gender: genderKey(p.gender), age: calculateAge(p.birthday) }] : []
    )
    const agesOf = (gender: GenderKey) =>
      withAge.filter((p) => p.gender === gender).map((p) => p.age)

    return {
      origins: [...new Set(everyone.map((p) => p.user.originDomain))].sort(),
      profiles: {
        total: profiles.length,
        social: profiles.filter((p) => p.isSocialActive).length,
        dating: dating.length,
        hidden: profiles.filter((p) => p.isHiddenFromResults).length,
      },
      dating: {
        gender: countByGender(dating),
        medianAge: {
          all: median(withAge.map((p) => p.age)),
          male: median(agesOf('male')),
          female: median(agesOf('female')),
        },
        ageBands: ageBandsFor(withAge.map((p) => p.age)).map(({ band, min, max }) => ({
          band,
          ...countByGender(withAge.filter((p) => p.age >= min && p.age <= max)),
        })),
        relationship: RelationshipStatusSchema.options.map((value) => ({
          value,
          ...countByGender(dating.filter((p) => (p.relationship ?? 'unspecified') === value)),
        })),
        hasKids: HasKidsSchema.options.map((value) => ({
          value,
          ...countByGender(dating.filter((p) => (p.hasKids ?? 'unspecified') === value)),
        })),
      },
      pool: this.getPool(everyone, new Set(profiles.map((p) => p.id))),
    }
  }

  /**
   * The filter picks whose matches are counted; candidates always come from
   * the whole site, as they do in the app.
   */
  private getPool(everyone: StatisticsProfile[], selectedIds: Set<string>) {
    const blocks = new Set<string>()
    const candidates: DatingEligibleProfile[] = []
    for (const p of everyone) {
      if (p.isHiddenFromResults) continue
      const parsed = DatingEligibleProfileSchema.safeParse(p)
      if (!parsed.success) continue
      candidates.push(parsed.data)
      for (const blocked of p.blockedProfiles) blocks.add(`${p.id}:${blocked.id}`)
    }

    const people = candidates
      .filter((viewer) => selectedIds.has(viewer.id))
      .map((viewer) => ({
        gender: genderKey(viewer.gender),
        age: calculateAge(viewer.birthday),
        matches: candidates.filter(
          (c) =>
            c.id !== viewer.id &&
            !blocks.has(`${viewer.id}:${c.id}`) &&
            !blocks.has(`${c.id}:${viewer.id}`) &&
            areMutuallyCompatible(viewer, c)
        ).length,
      }))

    const matchCounts = (group: typeof people) => ({
      count: group.length,
      median: median(group.map((p) => p.matches)),
    })

    return {
      gender: countByGender(people),
      fewMatches: people.filter((p) => p.matches <= FEW_MATCHES_MAX).length,
      ageBands: ageBandsFor(people.map((p) => p.age)).map(({ band, min, max }) => {
        const inBand = people.filter((p) => p.age >= min && p.age <= max)
        return {
          band,
          male: matchCounts(inBand.filter((p) => p.gender === 'male')),
          female: matchCounts(inBand.filter((p) => p.gender === 'female')),
        }
      }),
      distribution: MATCH_RANGES.map(({ range, min, max }) => ({
        range,
        ...countByGender(people.filter((p) => p.matches >= min && p.matches <= max)),
      })),
    }
  }
}
