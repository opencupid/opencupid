import { z } from 'zod';
import { ConnectionTypeSchema } from '../inputTypeSchemas/ConnectionTypeSchema'
import { ConnectionStatusSchema } from '../inputTypeSchemas/ConnectionStatusSchema'

/////////////////////////////////////////
// CONNECTION REQUEST SCHEMA
/////////////////////////////////////////

export const ConnectionRequestSchema = z.object({
  scope: ConnectionTypeSchema,
  status: ConnectionStatusSchema,
  id: z.cuid(),
  fromUserId: z.string(),
  toUserId: z.string(),
  createdAt: z.coerce.date(),
})

export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>

export default ConnectionRequestSchema;
