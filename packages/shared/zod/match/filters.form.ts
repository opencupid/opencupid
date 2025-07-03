import { z } from 'zod'
import { GenderSchema, HasKidsSchema } from '@zod/generated';
import { PublicTagSchema } from '../tag/tag.dto';
import { LocationSchema } from '../dto/location.dto';

export const DatingPreferencesFormSchema = z.object({
  prefAgeMin: z.number().int().gte(18).lte(120),
  prefAgeMax: z.number().int().gte(18).lte(120),
  prefGender: z.array(GenderSchema).default([]),
  prefKids: z.array(HasKidsSchema).default([]),
})

export type DatingPreferencesFormType = z.infer<typeof DatingPreferencesFormSchema>


export const SocialMatchFilterFormSchema = z.object({
  location: LocationSchema,
  radius: z.number().optional(),
  tags: z.array(PublicTagSchema).default([]),
})

export type SocialMatchFilterForm = z.infer<typeof SocialMatchFilterFormSchema>