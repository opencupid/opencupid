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
  profileAId: z.string().nullable(),
  profileBId: z.string().nullable(),
  initiatorProfileId: z.string().nullable(),
  jitsiRoomId: z.string().nullable(),
})

export type Conversation = z.infer<typeof ConversationSchema>

export default ConversationSchema;
