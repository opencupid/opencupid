import { z } from 'zod';

/////////////////////////////////////////
// EVENT CONTENT SCHEMA
/////////////////////////////////////////

export const EventContentSchema = z.object({
  userContentId: z.string(),
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
})

export type EventContent = z.infer<typeof EventContentSchema>

export default EventContentSchema;
