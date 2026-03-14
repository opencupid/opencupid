import { prisma } from '../lib/prisma'

import { type DbProfileWithImages, DatingEligibleProfileSchema } from '@zod/profile/profile.db'
import type {
  SocialMatchFilterWithTags,
  UpdateSocialMatchFilterPayload,
} from '@zod/match/filters.dto'

import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes'
import type { LocationDTO } from '@zod/dto/location.dto'
import { type Prisma } from '@prisma/client'
import { calculateAge } from '@zod/match/filters.form'

const tagInclude = {
  // city: true,
  tags: {
    include: {
      translations: {
        select: { name: true, locale: true },
      },
    },
  },
}

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

  async getSocialMatchFilter(profileId: string): Promise<SocialMatchFilterWithTags | null> {
    return await prisma.socialMatchFilter.findUnique({
      where: { profileId },
      include: {
        ...tagInclude,
      },
    })
  }

  async updateSocialMatchFilter(
    profileId: string,
    data: UpdateSocialMatchFilterPayload
  ): Promise<SocialMatchFilterWithTags | null> {
    const tagIds = (data.tags ?? []).map((id) => ({ id }))
    const update = {
      profileId,
      country: data.location?.country || null,
      cityName: data.location?.cityName || null,
      lat: data.location?.lat ?? null,
      lon: data.location?.lon ?? null,
      radius: data.radius,
      tags: {
        set: tagIds, // ✅ safe for update
      },
    }

    const create = {
      profileId,
      country: data.location?.country || null,
      cityName: data.location?.cityName || null,
      lat: data.location?.lat ?? null,
      lon: data.location?.lon ?? null,
      radius: data.radius,
      tags: {
        connect: tagIds, // ✅ required for create
      },
    }

    return await prisma.socialMatchFilter.upsert({
      where: { profileId },
      update,
      create,
      include: {
        ...tagInclude,
      },
    })
  }

  async createSocialMatchFilter(
    tx: Prisma.TransactionClient,
    profileId: string,
    location: LocationDTO
  ): Promise<SocialMatchFilterWithTags | null> {
    return await tx.socialMatchFilter.create({
      data: {
        profileId,
        country: location.country || null,
        cityName: location.cityName || null,
        lat: location.lat ?? null,
        lon: location.lon ?? null,
      },
      include: {
        ...tagInclude,
      },
    })
  }
  private async buildSocialWhereClause(profileId: string) {
    const userPrefs = await this.getSocialMatchFilter(profileId)
    if (!userPrefs) return null

    const tagIds = userPrefs.tags?.map((tag) => tag.id)

    return {
      ...statusFlags,
      isSocialActive: true,
      ...(userPrefs.country ? { country: userPrefs.country } : {}),
      ...(userPrefs.tags?.length ? { tags: { some: { id: { in: tagIds } } } } : {}),
      ...blocklistWhereClause(profileId),
    }
  }

  async findSocialProfilesFor(
    profileId: string,
    orderBy: OrderBy = defaultOrderBy,
    take: number = 10,
    skip: number = 0
  ): Promise<DbProfileWithImages[]> {
    const where = await this.buildSocialWhereClause(profileId)
    if (!where) return []

    return await prisma.profile.findMany({
      where,
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take,
      skip,
      orderBy,
    })
  }

  async findSocialProfilesInBounds(
    profileId: string,
    bounds: { south: number; north: number; west: number; east: number },
    orderBy: OrderBy = defaultOrderBy
  ): Promise<DbProfileWithImages[]> {
    const userPrefs = await this.getSocialMatchFilter(profileId)
    if (!userPrefs) return []

    const tagIds = userPrefs.tags?.map((tag) => tag.id)
    const tagFilter = tagIds?.length ? { tags: { some: { id: { in: tagIds } } } } : {}
    const boundsFilter = {
      lat: { not: null, gte: bounds.south, lte: bounds.north },
      lon: { not: null, gte: bounds.west, lte: bounds.east },
    }

    return await prisma.profile.findMany({
      where: {
        ...statusFlags,
        isSocialActive: true,
        ...tagFilter,
        ...boundsFilter,
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

  async findSocialProfilesWithLocation(
    profileId: string,
    orderBy: OrderBy = defaultOrderBy,
    bounds?: { south: number; north: number; west: number; east: number }
  ): Promise<DbProfileWithImages[]> {
    const where = await this.buildSocialWhereClause(profileId)
    if (!where) return []

    const locationFilter = bounds
      ? {
          lat: { not: null, gte: bounds.south, lte: bounds.north },
          lon: { not: null, gte: bounds.west, lte: bounds.east },
        }
      : { lat: { not: null }, lon: { not: null } }

    return await prisma.profile.findMany({
      where: { ...where, ...locationFilter },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take: 500,
      orderBy,
    })
  }

  async findLocalProfiles(
    profileId: string,
    orderBy: OrderBy = defaultOrderBy,
    take: number = 10,
    skip: number = 0
  ): Promise<DbProfileWithImages[]> {
    const userPrefs = await this.getSocialMatchFilter(profileId)

    if (!userPrefs) {
      return [] // no preferences set, return empty array
    }

    const filters = {
      ...(userPrefs.country ? { country: userPrefs.country } : {}),
    }

    const profiles = await prisma.profile.findMany({
      where: {
        ...statusFlags,
        isSocialActive: true,
        id: {
          not: profileId,
        },
        ...filters,
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
