import { prisma } from '../lib/prisma'

import { type DbProfileWithImages } from '@zod/profile/profile.db';
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause';
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes';
import { DatingFilter, Gender, HasKids } from '@zod/generated';


export class ProfileFilterService {
  private static instance: ProfileFilterService;

  private constructor() {
  }

  public static getInstance(): ProfileFilterService {
    if (!ProfileFilterService.instance) {
      ProfileFilterService.instance = new ProfileFilterService();
    }
    return ProfileFilterService.instance;
  }

  async findSocialProfilesFor(profileId: string): Promise<DbProfileWithImages[]> {
    return await prisma.profile.findMany({
      where: {
        isActive: true,
        isSocialActive: true,
        id: {
          not: profileId,
        },
        ...blocklistWhereClause(profileId), // shared with blocklistWhereClause.ts
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

    // Get dating filter preferences for this profile
    const datingFilter = await this.getDatingFilter(profileId);
    if (!datingFilter) {
      return []
    }

    const myAge = calculateAge(profile.birthday)
    const prefAgeMax = datingFilter.prefAgeMax ? datingFilter.prefAgeMax + 1 : 99
    const prefAgeMin = datingFilter.prefAgeMin ? datingFilter.prefAgeMin - 1 : 18
    
    const where = {
      id: { not: profile.id },
      ...blocklistWhereClause(profileId),
      isDatingActive: true,
      birthday: {
        gte: subtractYears(new Date(), prefAgeMax), // oldest acceptable
        lte: subtractYears(new Date(), prefAgeMin), // youngest acceptable
      },
      gender: { in: datingFilter.prefGender },
      hasKids: { in: datingFilter.prefKids },
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

    // Get dating filters for both profiles
    const [aFilter, bFilter] = await Promise.all([
      this.getDatingFilter(aId),
      this.getDatingFilter(bId)
    ]);

    if (!aFilter || !bFilter) return false

    const ageA = calculateAge(a.birthday)
    const ageB = calculateAge(b.birthday)

    const aMatchesB =
      ageB >= (aFilter.prefAgeMin ?? 18) &&
      ageB <= (aFilter.prefAgeMax ?? 99) &&
      aFilter.prefGender.includes(b.gender) &&
      (b.hasKids == null || aFilter.prefKids.includes(b.hasKids) || aFilter.prefKids.length === 0)

    const bMatchesA =
      ageA >= (bFilter.prefAgeMin ?? 18) &&
      ageA <= (bFilter.prefAgeMax ?? 99) &&
      bFilter.prefGender.includes(a.gender) &&
      (a.hasKids == null || bFilter.prefKids.includes(a.hasKids) || bFilter.prefKids.length === 0)

    return aMatchesB && bMatchesA
  }

  async getDatingFilter(profileId: string): Promise<DatingFilter | null> {
    return await prisma.datingFilter.findUnique({
      where: { profileId },
    })
  }

  async upsertDatingFilter(profileId: string, filterData: {
    prefAgeMin?: number | null;
    prefAgeMax?: number | null;
    prefGender?: Gender[];
    prefKids?: HasKids[];
  }): Promise<DatingFilter> {
    return await prisma.datingFilter.upsert({
      where: { profileId },
      update: filterData,
      create: {
        profileId,
        ...filterData,
      },
    })
  }

  // Add methods for profile filter operations here
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
