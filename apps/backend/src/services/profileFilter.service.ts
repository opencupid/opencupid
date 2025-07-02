import { prisma } from '../lib/prisma'
import { type DatingPreferences } from '@prisma/client'
import { type DatingPreferencesDTO, DatingPreferencesDTOSchema, type UpdateDatingPreferencesPayload } from '@zod/match/datingPreference.dto'

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

  async getDatingPreferences(profileId: string): Promise<DatingPreferences | null> {
    return await prisma.datingPreferences.findUnique({
      where: { profileId }
    });
  }

  async createDatingPreferences(profileId: string, data: Partial<DatingPreferences>): Promise<DatingPreferences> {
    return await prisma.datingPreferences.create({
      data: {
        profileId,
        ...data
      }
    });
  }

  async updateDatingPreferences(profileId: string, data: UpdateDatingPreferencesPayload): Promise<DatingPreferences> {
    return await prisma.datingPreferences.upsert({
      where: { profileId },
      update: data,
      create: {
        profileId,
        ...data
      }
    });
  }

  async deleteDatingPreferences(profileId: string): Promise<void> {
    await prisma.datingPreferences.delete({
      where: { profileId }
    });
  }

  mapToDatingPreferencesDTO(prefs: DatingPreferences | null): DatingPreferencesDTO {
    if (!prefs) {
      // Return default values if no preferences exist
      return {
        prefAgeMin: null,
        prefAgeMax: null,
        prefGender: [],
        prefKids: []
      };
    }
    
    return DatingPreferencesDTOSchema.parse({
      prefAgeMin: prefs.prefAgeMin,
      prefAgeMax: prefs.prefAgeMax,
      prefGender: prefs.prefGender,
      prefKids: prefs.prefKids
    });
  }
}