import { z } from 'zod';

/////////////////////////////////////////
// PROFILE SESSION LOG SCHEMA
/////////////////////////////////////////

export const ProfileSessionLogSchema = z.object({
  id: z.cuid(),
  profileId: z.string(),
  startedAt: z.coerce.date(),
})

export type ProfileSessionLog = z.infer<typeof ProfileSessionLogSchema>

export default ProfileSessionLogSchema;
