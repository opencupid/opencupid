import { prisma } from '../lib/prisma'

import { type DbProfileWithImages } from '@zod/profile/profile.db';
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause';
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes';
import { ProfileFilterService } from './profileFilter.service';


export class MatchQueryService {
  private static instance: MatchQueryService;
  private profileFilterService: ProfileFilterService;

  private constructor() {
    this.profileFilterService = ProfileFilterService.getInstance();
  }

  public static getInstance(): MatchQueryService {
    if (!MatchQueryService.instance) {
      MatchQueryService.instance = new MatchQueryService();
    }
    return MatchQueryService.instance;
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
      include: {
        datingPreferences: true
      }
    })
    if (!profile || !profile.birthday || !profile.gender || profile.isDatingActive !== true) {
      return []
    }

    const datingPrefs = profile.datingPreferences;
    if (!datingPrefs) {
      return []
    }

    const myAge = calculateAge(profile.birthday)
    const prefAgeMax = datingPrefs.prefAgeMax ? datingPrefs.prefAgeMax + 1 : 99
    const prefAgeMin = datingPrefs.prefAgeMin ? datingPrefs.prefAgeMin - 1 : 18
    
    const where = {
      id: { not: profile.id },
      ...blocklistWhereClause(profileId),
      isDatingActive: true,
      birthday: {
        gte: subtractYears(new Date(), prefAgeMax), // oldest acceptable
        lte: subtractYears(new Date(), prefAgeMin), // youngest acceptable
      },
      gender: { in: datingPrefs.prefGender },
      hasKids: { in: datingPrefs.prefKids },
      datingPreferences: {
        prefAgeMin: { lte: myAge },
        prefAgeMax: { gte: myAge },
        prefGender: { hasSome: [profile.gender] },
        prefKids: profile.hasKids ? { hasSome: [profile.hasKids] } : undefined,
      }
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
      include: {
        datingPreferences: true
      }
    })

    if (!a || !b || !a.birthday || !b.birthday || !a.gender || !b.gender) return false
    if (!a.isDatingActive || !b.isDatingActive) return false
    if (!a.datingPreferences || !b.datingPreferences) return false

    const ageA = calculateAge(a.birthday)
    const ageB = calculateAge(b.birthday)

    const aMatchesB =
      ageB >= (a.datingPreferences.prefAgeMin ?? 18) &&
      ageB <= (a.datingPreferences.prefAgeMax ?? 99) &&
      a.datingPreferences.prefGender.includes(b.gender) &&
      (b.hasKids == null || a.datingPreferences.prefKids.includes(b.hasKids) || a.datingPreferences.prefKids.length === 0)

    const bMatchesA =
      ageA >= (b.datingPreferences.prefAgeMin ?? 18) &&
      ageA <= (b.datingPreferences.prefAgeMax ?? 99) &&
      b.datingPreferences.prefGender.includes(a.gender) &&
      (a.hasKids == null || b.datingPreferences.prefKids.includes(a.hasKids) || b.datingPreferences.prefKids.length === 0)

    return aMatchesB && bMatchesA
  }

  // Add methods for match query operations here
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
