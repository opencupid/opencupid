import { z } from 'zod';

export const ConversationStatusSchema = z.enum(['INITIATED','ACCEPTED','BLOCKED','ARCHIVED','PENDING','DISCARDED']);

export type ConversationStatusType = `${z.infer<typeof ConversationStatusSchema>}`

export default ConversationStatusSchema;
