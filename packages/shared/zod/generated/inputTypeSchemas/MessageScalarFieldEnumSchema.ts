import { z } from 'zod';

export const MessageScalarFieldEnumSchema = z.enum(['id','conversationId','senderId','content','messageType','createdAt','editedAt']);

export default MessageScalarFieldEnumSchema;
