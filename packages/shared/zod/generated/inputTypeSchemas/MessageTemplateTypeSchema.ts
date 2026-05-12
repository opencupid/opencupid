import { z } from 'zod';

export const MessageTemplateTypeSchema = z.enum(['welcome']);

export type MessageTemplateTypeType = `${z.infer<typeof MessageTemplateTypeSchema>}`

export default MessageTemplateTypeSchema;
