import { z } from 'zod';

/////////////////////////////////////////
// COMMUNITY CONTENT SCHEMA
/////////////////////////////////////////

export const CommunityContentSchema = z.object({
  userContentId: z.string(),
  yearFounded: z.number().int().nullable(),
})

export type CommunityContent = z.infer<typeof CommunityContentSchema>

export default CommunityContentSchema;
