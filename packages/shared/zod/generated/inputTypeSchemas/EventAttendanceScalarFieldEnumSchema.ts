import { z } from 'zod';

export const EventAttendanceScalarFieldEnumSchema = z.enum(['eventContentId','profileId','status','rsvpedAt','updatedAt']);

export default EventAttendanceScalarFieldEnumSchema;
