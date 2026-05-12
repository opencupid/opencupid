import { z } from 'zod';

/////////////////////////////////////////
// MESSAGE SCHEMA
/////////////////////////////////////////

export const MessageSchema = z.object({
  id: z.cuid(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  messageType: z.string(),
  createdAt: z.coerce.date(),
})

export type Message = z.infer<typeof MessageSchema>

export default MessageSchema;
