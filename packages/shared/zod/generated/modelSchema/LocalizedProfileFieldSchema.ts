import { z } from 'zod';

/////////////////////////////////////////
// LOCALIZED PROFILE FIELD SCHEMA
/////////////////////////////////////////

export const LocalizedProfileFieldSchema = z.object({
  id: z.cuid(),
  profileId: z.string(),
  field: z.string(),
  locale: z.string(),
  value: z.string(),
})

export type LocalizedProfileField = z.infer<typeof LocalizedProfileFieldSchema>

export default LocalizedProfileFieldSchema;
