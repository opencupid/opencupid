import { z } from 'zod';

export const AttendanceStatusSchema = z.enum(['GOING','MAYBE']);

export type AttendanceStatusType = `${z.infer<typeof AttendanceStatusSchema>}`

export default AttendanceStatusSchema;
