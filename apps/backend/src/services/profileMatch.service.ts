import { prisma } from '../lib/prisma'

import { type DbProfileWithImages } from '@zod/profile/profile.db';
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause';
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes';
import type { SocialMatchFilterDTO, SocialMatchFilterWithTags, UpdateSocialMatchFilterPayload } from '../../../../packages/shared/zod/match/filters.dto';
import { mapSocialMatchFilterToDTO } from '../api/mappers/profileMatch.mappers';

const tagInclude = {
  tags: {
    include: {
      translations: {
        select: { name: true, locale: true },
      },
    }
  },
}

export class ProfileMatchService {
  private static instance: ProfileMatchService;

  private constructor() {
  }

  public static getInstance(): ProfileMatchService {
    if (!ProfileMatchService.instance) {
      ProfileMatchService.instance = new ProfileMatchService();
    }
    return ProfileMatchService.instance;
  }

  async getSocialMatchFilter(profileId: string): Promise<SocialMatchFilterWithTags | null> {
    return await prisma.socialMatchFilter.findUnique({
      where: { profileId },
      include: {
        ...tagInclude,
      }
    })
  }
  async updateSocialMatchFilter(profileId: string, data: UpdateSocialMatchFilterPayload): Promise<SocialMatchFilterWithTags | null> {
    const tagIds = (data.tags ?? []).map(id => ({ id }))
    const update = {
      profileId,
      country: data.location?.country ?? '',
      cityId: data.location?.cityId ?? '',
      radius: data.radius ?? 0,
      tags: {
        set: tagIds, // ✅ safe for update
      },
    }

    const create = {
      profileId,
      country: data.location?.country ?? '',
      cityId: data.location?.cityId ?? '',
      radius: data.radius ?? 0,
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
      }
    })
  }

  async findSocialProfilesFor(profileId: string): Promise<DbProfileWithImages[]> {

    const userPrefs = await this.getSocialMatchFilter(profileId)

    if (!userPrefs) {
      return [] // no preferences set, return empty array
    }

    const tagIds = userPrefs.tags?.map(tag => tag.id)

    const filters = {
      ...(userPrefs.country ? { country: userPrefs.country } : {}),
      ...(userPrefs.cityId ? { cityId: userPrefs.cityId } : {}),
      ...(userPrefs.tags?.length ? {
        tags: {
          some: {
            tagId: { in: tagIds },
          },
        },
      } : {}),
    }

    return await prisma.profile.findMany({
      where: {
        isActive: true,
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
    })
  }

  async findMutualMatchesFor(profileId: string): Promise<DbProfileWithImages[]> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile || !profile.birthday || !profile.gender || profile.isDatingActive !== true) {
      return []
    }

    const myAge = calculateAge(profile.birthday)
    const prefAgeMax = profile.prefAgeMax ? profile.prefAgeMax + 1 : 99
    const prefAgeMin = profile.prefAgeMin ? profile.prefAgeMin - 1 : 18

    const where = {
      id: { not: profile.id },
      ...blocklistWhereClause(profileId),
      isDatingActive: true,
      birthday: {
        gte: subtractYears(new Date(), prefAgeMax), // oldest acceptable
        lte: subtractYears(new Date(), prefAgeMin), // youngest acceptable
      },
      gender: { in: profile.prefGender },
      hasKids: { in: profile.prefKids },
      prefAgeMin: { lte: myAge },
      prefAgeMax: { gte: myAge },
      prefGender: { hasSome: [profile.gender] },
      prefKids: profile.hasKids ? { hasSome: [profile.hasKids] } : undefined,
    }

    return prisma.profile.findMany({
      where: where,
      include: {
        ...tagsInclude(),  // shared with profile.service.ts - where to keep this?
        ...profileImageInclude(),
      }
    })
  }

  async areProfilesMutuallyCompatible(aId: string, bId: string): Promise<boolean> {
    const [a, b] = await prisma.profile.findMany({
      where: { id: { in: [aId, bId] } },
    })

    if (!a || !b || !a.birthday || !b.birthday || !a.gender || !b.gender) return false
    if (!a.isDatingActive || !b.isDatingActive) return false

    const ageA = calculateAge(a.birthday)
    const ageB = calculateAge(b.birthday)

    const aMatchesB =
      ageB >= (a.prefAgeMin ?? 18) &&
      ageB <= (a.prefAgeMax ?? 99) &&
      a.prefGender.includes(b.gender) &&
      (b.hasKids == null || a.prefKids.includes(b.hasKids) || a.prefKids.length === 0)

    const bMatchesA =
      ageA >= (b.prefAgeMin ?? 18) &&
      ageA <= (b.prefAgeMax ?? 99) &&
      b.prefGender.includes(a.gender) &&
      (a.hasKids == null || b.prefKids.includes(a.hasKids) || b.prefKids.length === 0)

    return aMatchesB && bMatchesA
  }

}




export function calculateAge(birthday: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const m = today.getMonth() - birthday.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
    age--
  }
  return age
}

export function subtractYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() - years)
  return d
}
