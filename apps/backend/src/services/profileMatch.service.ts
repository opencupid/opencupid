import { prisma } from '../lib/prisma'

import { type DbProfileWithImages } from '@zod/profile/profile.db';
import type { SocialMatchFilterWithTags, UpdateSocialMatchFilterPayload } from '@zod/match/filters.dto';

import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause';
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes';
import type { LocationDTO } from '@zod/dto/location.dto';
import { Gender, HasKids, type Prisma } from '@prisma/client';

const tagInclude = {
  // city: true,
  tags: {
    include: {
      translations: {
        select: { name: true, locale: true },
      },
    }
  },
}


export type OrderBy = Prisma.Enumerable<Prisma.ProfileOrderByWithRelationInput> | Prisma.ProfileOrderByWithRelationInput

const defaultOrderBy: OrderBy = {
  updatedAt: 'desc',
}

const statusFlags = {
  isActive: true,
  isOnboarded: true,
}

export class ProfileMatchService {

  async findNewProfilesAnywhere(profileId: string, orderBy: OrderBy = defaultOrderBy, take: number = 20, skip: number = 0): Promise<DbProfileWithImages[]> {
    console.log('🔍 ProfileMatchService.findNewProfilesAnywhere:', { profileId, take, skip })

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

    console.log('✅ ProfileMatchService.findNewProfilesAnywhere - found:', profiles.length)
    return profiles
  }

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
      country: data.location?.country || null,
      cityName: data.location?.cityName || null,
      lat: data.location?.lat ?? null,
      lon: data.location?.lon ?? null,
      radius: data.radius ?? 0,
      tags: {
        set: tagIds, // ✅ safe for update
      },
    }

    const create = {
      profileId,
      country: data.location?.country ?? '',
      cityName: data.location?.cityName || null,
      lat: data.location?.lat ?? null,
      lon: data.location?.lon ?? null,
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

  async createSocialMatchFilter(tx: Prisma.TransactionClient, profileId: string, location: LocationDTO): Promise<SocialMatchFilterWithTags | null> {
    return await tx.socialMatchFilter.create({
      data: {
        profileId,
        country: location.country ?? '',
      },
      include: {
        ...tagInclude,
      }
    })
  }
  createDatingPrefsDefaults(profile: { birthday?: Date | null, gender?: Gender | null }) {

    if (!profile.birthday) return {}
    const currentYear = new Date().getFullYear()
    const age = currentYear - new Date(profile.birthday).getFullYear()
    const prefGender = profile.gender === Gender.male ? Gender.female : Gender.male
    const prefs = {
      prefAgeMin: age ? age - 5 : 18,
      prefAgeMax: age ? age + 5 : 100,
      prefGender: [prefGender],
      prefKids: [HasKids.no, HasKids.yes],
    }
    // for now we'll just return the created preferences object.
    return prefs
    /*
    // TODO this will eventually moved to its own table, then we'll upsert it from here
    return await tx.profile.update({
      where: { id: profile.id },
      data: prefs,
    })
      */
  }



  async findSocialProfilesFor(profileId: string, orderBy: OrderBy = defaultOrderBy, take: number = 20, skip: number = 0): Promise<DbProfileWithImages[]> {
    console.log('🔍 ProfileMatchService.findSocialProfilesFor:', { profileId, take, skip })

    const userPrefs = await this.getSocialMatchFilter(profileId)

    if (!userPrefs) {
      console.log('⚠️ No user preferences found for profileId:', profileId)
      return [] // no preferences set, return empty array
    }

    const tagIds = userPrefs.tags?.map(tag => tag.id)

    const filters = {
      ...(userPrefs.country ? { country: userPrefs.country } : {}),
      ...(userPrefs.tags?.length ? {
        tags: {
          some: {
            id: { in: tagIds },
          },
        },
      } : {}),
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

    console.log('✅ ProfileMatchService.findSocialProfilesFor - found:', profiles.length)
    return profiles
  }


  async findLocalProfiles(profileId: string, orderBy: OrderBy = defaultOrderBy, take: number = 20, skip: number = 0): Promise<DbProfileWithImages[]> {
    console.log('🔍 ProfileMatchService.findLocalProfiles:', { profileId, take, skip })

    const userPrefs = await this.getSocialMatchFilter(profileId)

    if (!userPrefs) {
      console.log('⚠️ No user preferences found for profileId:', profileId)
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

    console.log('✅ ProfileMatchService.findLocalProfiles - found:', profiles.length)
    return profiles
  }


  async findMutualMatchesFor(profileId: string, orderBy: OrderBy = defaultOrderBy, take: number = 20, skip: number = 0): Promise<DbProfileWithImages[]> {
    console.log('🔍 ProfileMatchService.findMutualMatchesFor:', { profileId, take, skip })

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile || !profile.birthday || !profile.gender || profile.isDatingActive !== true) {
      console.log('⚠️ Profile not suitable for dating matches:', { profileId, hasBirthday: !!profile?.birthday, hasGender: !!profile?.gender, isDatingActive: profile?.isDatingActive })
      return []
    }

    const myAge = calculateAge(profile.birthday)
    const prefAgeMax = profile.prefAgeMax ? profile.prefAgeMax + 1 : 99
    const prefAgeMin = profile.prefAgeMin ? profile.prefAgeMin - 1 : 18

    const hasKids = profile.prefKids.length > 0 ? { hasKids: { in: profile.prefKids } } : {}

    const where = {
      ...statusFlags,
      isDatingActive: true,
      id: {
        not: profile.id
      },
      ...blocklistWhereClause(profileId),
      birthday: {
        gte: subtractYears(new Date(), prefAgeMax), // oldest acceptable
        lte: subtractYears(new Date(), prefAgeMin), // youngest acceptable
      },
      gender: { in: profile.prefGender },
      ...hasKids,
      prefAgeMin: { lte: myAge },
      prefAgeMax: { gte: myAge },
      prefGender: { hasSome: [profile.gender] },
      prefKids: profile.hasKids ? { hasSome: [profile.hasKids] } : undefined,
    }

    const profiles = await prisma.profile.findMany({
      where: where,
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
      take: take,
      skip: skip,
      orderBy: orderBy,
    })

    console.log('✅ ProfileMatchService.findMutualMatchesFor - found:', profiles.length)
    return profiles
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
