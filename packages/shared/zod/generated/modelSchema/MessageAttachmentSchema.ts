import { z } from 'zod';

/////////////////////////////////////////
// MESSAGE ATTACHMENT SCHEMA
/////////////////////////////////////////

export const MessageAttachmentSchema = z.object({
  id: z.cuid(),
  messageId: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().nullable(),
  duration: z.number().int().nullable(),
  createdAt: z.coerce.date(),
})

export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>

export default MessageAttachmentSchema;
