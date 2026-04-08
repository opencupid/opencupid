import type { Profile } from '@zod/generated'
import { type DatingPreferencesFormType } from '@zod/match/filters.form'
import { DatingEligibleProfileSchema } from '@zod/profile/profile.db'

export function mapProfileToDatingPreferencesDTO(profile: Profile): DatingPreferencesFormType {
  return DatingEligibleProfileSchema.pick({
    prefAgeMin: true,
    prefAgeMax: true,
    prefGender: true,
    prefKids: true,
  }).parse(profile)
}
