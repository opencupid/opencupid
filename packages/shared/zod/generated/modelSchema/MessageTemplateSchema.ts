import { z } from 'zod';
import { MessageTemplateTypeSchema } from '../inputTypeSchemas/MessageTemplateTypeSchema'

/////////////////////////////////////////
// MESSAGE TEMPLATE SCHEMA
/////////////////////////////////////////

export const MessageTemplateSchema = z.object({
  type: MessageTemplateTypeSchema,
  id: z.cuid(),
  locale: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type MessageTemplate = z.infer<typeof MessageTemplateSchema>

export default MessageTemplateSchema;
