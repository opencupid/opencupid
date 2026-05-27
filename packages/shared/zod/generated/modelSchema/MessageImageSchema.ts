import { z } from 'zod';

/////////////////////////////////////////
// MESSAGE IMAGE SCHEMA
/////////////////////////////////////////

export const MessageImageSchema = z.object({
  imageId: z.string(),
  messageId: z.string(),
})

export type MessageImage = z.infer<typeof MessageImageSchema>

export default MessageImageSchema;
