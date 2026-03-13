import { z } from 'zod'
import { GenderSchema, HasKidsSchema } from '@zod/generated'
import { PublicTagSchema } from '../tag/tag.dto'
import { LocationSchema } from '../dto/location.dto'

export const PREF_AGE_MIN = 18
export const PREF_AGE_MAX = 80

export const DatingPreferencesFormSchema = z.object({
  prefAgeMin: z.number().int().gte(PREF_AGE_MIN).lte(120).default(PREF_AGE_MIN),
  prefAgeMax: z.number().int().gte(PREF_AGE_MIN).lte(120).default(PREF_AGE_MAX),
  prefGender: z.array(GenderSchema).default([]),
  prefKids: z.array(HasKidsSchema).default(['yes', 'no']),
})

export type DatingPreferencesFormType = z.infer<typeof DatingPreferencesFormSchema>

/** Validates that dating preferences are complete and ready for submission. */
export const DatingPreferencesValidationSchema = DatingPreferencesFormSchema.extend({
  prefGender: z.array(GenderSchema).min(1),
  prefKids: z.array(HasKidsSchema).min(1),
}).refine((data) => data.prefAgeMax > data.prefAgeMin, {
  path: ['prefAgeMax'],
  message: 'Max age must be greater than min age',
})

export const isDatingPreferencesValid = (
  prefs: Record<string, unknown> | null | undefined
): boolean => {
  if (!prefs) return false
  return DatingPreferencesValidationSchema.safeParse(prefs).success
}

export const SocialMatchFilterFormSchema = z.object({
  location: LocationSchema,
  radius: z.number().optional(),
  tags: z.array(PublicTagSchema).default([]),
})

export type SocialMatchFilterForm = z.infer<typeof SocialMatchFilterFormSchema>
