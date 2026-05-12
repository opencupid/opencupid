import { z } from 'zod';

export const ConnectionStatusSchema = z.enum(['pending','accepted','rejected','blocked']);

export type ConnectionStatusType = `${z.infer<typeof ConnectionStatusSchema>}`

export default ConnectionStatusSchema;
