import { z } from 'zod';
import { AttendanceStatusSchema } from '../inputTypeSchemas/AttendanceStatusSchema'

/////////////////////////////////////////
// EVENT ATTENDANCE SCHEMA
/////////////////////////////////////////

export const EventAttendanceSchema = z.object({
  status: AttendanceStatusSchema,
  eventContentId: z.string(),
  profileId: z.string(),
  rsvpedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type EventAttendance = z.infer<typeof EventAttendanceSchema>

export default EventAttendanceSchema;
