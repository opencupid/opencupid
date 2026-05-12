import { z } from 'zod';
import { ConversationStatusSchema } from '../inputTypeSchemas/ConversationStatusSchema'

/////////////////////////////////////////
// CONVERSATION SCHEMA
/////////////////////////////////////////

export const ConversationSchema = z.object({
  status: ConversationStatusSchema,
  id: z.cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  profileAId: z.string(),
  profileBId: z.string(),
  initiatorProfileId: z.string(),
  jitsiRoomId: z.string().nullable(),
})

export type Conversation = z.infer<typeof ConversationSchema>

export default ConversationSchema;
