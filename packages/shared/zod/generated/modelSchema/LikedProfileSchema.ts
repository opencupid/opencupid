import { z } from 'zod';

/////////////////////////////////////////
// LIKED PROFILE SCHEMA
/////////////////////////////////////////

export const LikedProfileSchema = z.object({
  id: z.cuid(),
  fromId: z.string(),
  toId: z.string(),
  createdAt: z.coerce.date(),
  isNew: z.boolean(),
  isAnonymous: z.boolean(),
})

export type LikedProfile = z.infer<typeof LikedProfileSchema>

export default LikedProfileSchema;
