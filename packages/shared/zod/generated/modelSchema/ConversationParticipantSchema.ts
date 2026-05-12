import { z } from 'zod';

/////////////////////////////////////////
// CONVERSATION PARTICIPANT SCHEMA
/////////////////////////////////////////

export const ConversationParticipantSchema = z.object({
  id: z.cuid(),
  profileId: z.string(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().nullable(),
  isMuted: z.boolean(),
  isArchived: z.boolean(),
  isCallable: z.boolean(),
})

export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>

export default ConversationParticipantSchema;
