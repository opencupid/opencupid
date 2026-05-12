import { z } from 'zod';

export const ActivitySegmentSchema = z.enum(['new','returning','frequent','dormant']);

export type ActivitySegmentType = `${z.infer<typeof ActivitySegmentSchema>}`

export default ActivitySegmentSchema;
