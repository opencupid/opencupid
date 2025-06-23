import { DbProfileComplete, DbProfileWithImages } from '@zod/profile/profile.db';
import { prisma } from '../lib/prisma'

import { type Profile, HasKidsType } from '@zod/generated';
import { profileCompleteInclude } from '@/db/includes/profileCompleteInclude';


export class MatchQueryService {
  private static instance: MatchQueryService;

  private constructor() {
  }

  public static getInstance(): MatchQueryService {
    if (!MatchQueryService.instance) {
      MatchQueryService.instance = new MatchQueryService();
    }
    return MatchQueryService.instance;
  }


  async findMutualMatchesForProfile(locale: string, profileId: string): Promise<DbProfileWithImages[]> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile || !profile.birthday || !profile.gender || profile.isDatingActive !== true) {
      return []
    }

    const myAge = this.calculateAge(profile.birthday)

    return prisma.profile.findMany({
      where: {
        id: { not: profile.id },
        isDatingActive: true,
        birthday: {
          gte: this.subtractYears(new Date(), profile.prefAgeMax ?? 99), // oldest acceptable
          lte: this.subtractYears(new Date(), profile.prefAgeMin ?? 18), // youngest acceptable
        },
        gender: { in: profile.prefGender },
        hasKids: { in: profile.prefKids },
        prefAgeMin: { lte: myAge },
        prefAgeMax: { gte: myAge },
        prefGender: { hasSome: [profile.gender] },
        prefKids: profile.hasKids ? { hasSome: [profile.hasKids] } : undefined,
      },
      include: {
        ...profileCompleteInclude(),  // shared with profile.service.ts - where to keep this?
      }
    })
  }

  private calculateAge(birthday: Date): number {
    const today = new Date()
    let age = today.getFullYear() - birthday.getFullYear()
    const m = today.getMonth() - birthday.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
      age--
    }
    return age
  }

  private subtractYears(date: Date, years: number): Date {
    const d = new Date(date)
    d.setFullYear(d.getFullYear() - years)
    return d
  }

  // Add methods for match query operations here
}