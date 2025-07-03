import { prisma } from '../lib/prisma'

import { type DbProfileWithImages } from '@zod/profile/profile.db';
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause';
import { profileImageInclude, tagsInclude } from '@/db/includes/profileIncludes';


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

  async getFilter(profileId: string) {
    return prisma.datingFilter.findUnique({ where: { profileId } })
  }

  async upsertFilter(profileId: string, data: Partial<{ prefAgeMin: number | null; prefAgeMax: number | null; prefGender: any[]; prefKids: any[] }>) {
    return prisma.datingFilter.upsert({
      where: { profileId },
      update: data,
      create: { profileId, ...data },
    })
  }

  async findMutualMatchesFor(profileId: string): Promise<DbProfileWithImages[]> {
    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile || !profile.birthday || !profile.gender || profile.isDatingActive !== true) {
      return []
    }

    const myFilter = await prisma.datingFilter.findUnique({ where: { profileId } })
    const myAge = calculateAge(profile.birthday)
    const prefAgeMax = myFilter?.prefAgeMax ? myFilter.prefAgeMax + 1 : 99
    const prefAgeMin = myFilter?.prefAgeMin ? myFilter.prefAgeMin - 1 : 18

    const candidates = await prisma.profile.findMany({
      where: {
        id: { not: profile.id },
        ...blocklistWhereClause(profileId),
        isDatingActive: true,
        birthday: {
          gte: subtractYears(new Date(), prefAgeMax),
          lte: subtractYears(new Date(), prefAgeMin),
        },
        gender: { in: myFilter?.prefGender ?? [] },
        hasKids: { in: myFilter?.prefKids ?? [] },
      },
      include: {
        ...tagsInclude(),
        ...profileImageInclude(),
      },
    })

    const candidateFilters = await prisma.datingFilter.findMany({
      where: { profileId: { in: candidates.map(c => c.id) } },
    })
    const filterMap = new Map(candidateFilters.map(f => [f.profileId, f]))

    return candidates.filter(c => {
      const f = filterMap.get(c.id)
      if (!c.birthday || !c.gender) return false
      const ageA = myAge
      const bMatchesA =
        ageA >= (f?.prefAgeMin ?? 18) &&
        ageA <= (f?.prefAgeMax ?? 99) &&
        (f?.prefGender.includes(profile.gender) ?? false) &&
        (profile.hasKids == null || (f?.prefKids.includes(profile.hasKids) || (f?.prefKids.length ?? 0) === 0))
      return bMatchesA
    })
  }

  async areProfilesMutuallyCompatible(aId: string, bId: string): Promise<boolean> {
    const [a, b] = await prisma.profile.findMany({ where: { id: { in: [aId, bId] } } })

    if (!a || !b || !a.birthday || !b.birthday || !a.gender || !b.gender) return false
    if (!a.isDatingActive || !b.isDatingActive) return false

    const [af, bf] = await Promise.all([
      prisma.datingFilter.findUnique({ where: { profileId: a.id } }),
      prisma.datingFilter.findUnique({ where: { profileId: b.id } }),
    ])

    const ageA = calculateAge(a.birthday)
    const ageB = calculateAge(b.birthday)

    const aMatchesB =
      ageB >= (af?.prefAgeMin ?? 18) &&
      ageB <= (af?.prefAgeMax ?? 99) &&
      (af?.prefGender.includes(b.gender) ?? false) &&
      (b.hasKids == null || (af?.prefKids.includes(b.hasKids) || (af?.prefKids.length ?? 0) === 0))

    const bMatchesA =
      ageA >= (bf?.prefAgeMin ?? 18) &&
      ageA <= (bf?.prefAgeMax ?? 99) &&
      (bf?.prefGender.includes(a.gender) ?? false) &&
      (a.hasKids == null || (bf?.prefKids.includes(a.hasKids) || (bf?.prefKids.length ?? 0) === 0))

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
