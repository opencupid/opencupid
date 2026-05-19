import { z } from 'zod';

/////////////////////////////////////////
// PROFILE IMAGE SCHEMA
/////////////////////////////////////////

export const ProfileImageSchema = z.object({
  imageId: z.string(),
  profileId: z.string(),
})

export type ProfileImage = z.infer<typeof ProfileImageSchema>

export default ProfileImageSchema;
