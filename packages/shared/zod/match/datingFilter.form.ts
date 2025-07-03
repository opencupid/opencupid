import { z } from 'zod'
import { GenderSchema, HasKidsSchema } from '@zod/generated';

export const DatingFilterFormSchema = z.object({
  prefAgeMin: z.number().int().gte(18).lte(120),
  prefAgeMax: z.number().int().gte(18).lte(120),
  prefGender: z.array(GenderSchema).default([]),
  prefKids: z.array(HasKidsSchema).default([]),
})

export type DatingFilterFormType = z.infer<typeof DatingFilterFormSchema>;
