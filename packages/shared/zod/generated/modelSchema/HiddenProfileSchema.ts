import { z } from 'zod';

/////////////////////////////////////////
// HIDDEN PROFILE SCHEMA
/////////////////////////////////////////

export const HiddenProfileSchema = z.object({
  id: z.cuid(),
  fromId: z.string(),
  toId: z.string(),
  createdAt: z.coerce.date(),
})

export type HiddenProfile = z.infer<typeof HiddenProfileSchema>

export default HiddenProfileSchema;
