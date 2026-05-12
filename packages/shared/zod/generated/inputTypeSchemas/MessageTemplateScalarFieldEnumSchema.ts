import { z } from 'zod';

export const MessageTemplateScalarFieldEnumSchema = z.enum(['id','type','locale','content','createdAt','updatedAt']);

export default MessageTemplateScalarFieldEnumSchema;
