import { z } from 'zod';

export const ConnectionTypeSchema = z.enum(['friend','dating']);

export type ConnectionTypeType = `${z.infer<typeof ConnectionTypeSchema>}`

export default ConnectionTypeSchema;
