import { prisma } from '../lib/prisma'

import { type DbProfileWithImages, DatingEligibleProfileSchema } from '@zod/profile/profile.db'

import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes'
import { type Prisma } from '@prisma/client'
import { calculateAge } from '@zod/match/filters.form'

export type OrderBy =
  | Prisma.Enumerable<Prisma.ProfileOrderByWithRelationInput>
  | Prisma.ProfileOrderByWithRelationInput

const defaultOrderBy: OrderBy = {
  updatedAt: 'desc',
}

const statusFlags = {
  isActive: true,
  isOnboarded: true,
}

export class ProfileMatchService {
  async findNewProfilesAnywhere(
    profileId: string,
    orderBy: OrderBy = defaultOrderBy,
    take: number = 10,
    skip: number = 0
  ): Promise<DbProfileWithImages[]> {
    const profiles = await prisma.profile.findMany({
      where: {
        ...statusFlags,
        isSocialActive: true,
        id: {
          not: profileId,
        },
        ...blocklistWhereClause(profileId),
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take: take,
      skip: skip,
      orderBy: orderBy,
    })

    return profiles
  }

  private static instance: ProfileMatchService

  private constructor() {}

  public static getInstance(): ProfileMatchService {
    if (!ProfileMatchService.instance) {
      ProfileMatchService.instance = new ProfileMatchService()
    }
    return ProfileMatchService.instance
  }

  /**
   * Fetches all social profiles with a location, optionally filtered by tagIds.
   * Used by ClusterService.buildIndex to seed the supercluster index.
   *
   * The viewer's own profile is intentionally NOT excluded — the frontend
   * empty-state logic in `useProfilesViewModel.isNoOneAround` relies on the
   * viewer being present in the cluster results to detect "I'm alone on
   * the map" and render the NoResultsCTA.
   */
  async findSocialProfilesWithLocation(
    profileId: string,
    tagIds: string[] = [],
    orderBy: OrderBy = defaultOrderBy
  ): Promise<DbProfileWithImages[]> {
    const tagFilter = tagIds.length ? { tags: { some: { id: { in: tagIds } } } } : {}

    return await prisma.profile.findMany({
      where: {
        ...statusFlags,
        isSocialActive: true,
        lat: { not: null },
        lon: { not: null },
        ...tagFilter,
        ...blocklistWhereClause(profileId),
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take: 500,
      orderBy,
    })
  }

  async findMutualMatchesFor(
    profileId: string,
    orderBy: OrderBy = defaultOrderBy,
    take: number = 10,
    skip: number = 0
  ): Promise<DbProfileWithImages[]> {
    const raw = await prisma.profile.findUnique({
      where: { id: profileId },
    })
    const parsed = DatingEligibleProfileSchema.safeParse(raw)
    if (!parsed.success) return []

    const profile = parsed.data
    const myAge = calculateAge(profile.birthday)
    const hasKids = profile.prefKids.length > 0 ? { hasKids: { in: profile.prefKids } } : {}

    return prisma.profile.findMany({
      where: {
        ...statusFlags,
        isDatingActive: true,
        id: { not: profile.id },
        ...blocklistWhereClause(profileId),
        birthday: {
          gte: subtractYears(new Date(), profile.prefAgeMax + AGE_TOLERANCE),
          lte: subtractYears(new Date(), profile.prefAgeMin - AGE_TOLERANCE),
        },
        gender: { in: profile.prefGender },
        ...hasKids,
        prefAgeMin: { lte: myAge + AGE_TOLERANCE },
        prefAgeMax: { gte: myAge - AGE_TOLERANCE },
        prefGender: { hasSome: [profile.gender] },
        prefKids: profile.hasKids ? { hasSome: [profile.hasKids] } : undefined,
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take,
      skip,
      orderBy,
    })
  }

  async findMutualMatchIds(profileId: string): Promise<string[]> {
    const matches = await this.findMutualMatchesFor(profileId, { updatedAt: 'desc' }, 1000, 0)
    return matches.map((p) => p.id)
  }

  async areProfilesMutuallyCompatible(aId: string, bId: string): Promise<boolean> {
    const rows = await prisma.profile.findMany({
      where: { id: { in: [aId, bId] } },
    })
    const a = DatingEligibleProfileSchema.safeParse(rows[0])
    const b = DatingEligibleProfileSchema.safeParse(rows[1])
    if (!a.success || !b.success) return false

    const ageA = calculateAge(a.data.birthday)
    const ageB = calculateAge(b.data.birthday)

    const aMatchesB =
      isAgeCompatible(ageB, a.data.prefAgeMin, a.data.prefAgeMax) &&
      a.data.prefGender.includes(b.data.gender) &&
      (a.data.prefKids.length === 0 ||
        (b.data.hasKids != null && a.data.prefKids.includes(b.data.hasKids)))

    const bMatchesA =
      isAgeCompatible(ageA, b.data.prefAgeMin, b.data.prefAgeMax) &&
      b.data.prefGender.includes(a.data.gender) &&
      (b.data.prefKids.length === 0 ||
        (a.data.hasKids != null && b.data.prefKids.includes(a.data.hasKids)))

    return aMatchesB && bMatchesA
  }
}

export function subtractYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() - years)
  return d
}

/**
 * ±1 year tolerance on age preference boundaries. Accounts for rounding in
 * discrete age calculation (e.g. someone turning 35 later this year should
 * still match a prefAgeMin of 35). Must be applied symmetrically in both
 * directions to avoid one-way matches.
 */
const AGE_TOLERANCE = 1

/** Check whether `candidateAge` falls within the viewer's age preference range (with tolerance). */
export function isAgeCompatible(
  candidateAge: number,
  prefAgeMin: number,
  prefAgeMax: number
): boolean {
  return candidateAge >= prefAgeMin - AGE_TOLERANCE && candidateAge <= prefAgeMax + AGE_TOLERANCE
}
