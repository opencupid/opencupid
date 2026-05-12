import { z } from 'zod';

export const MessageAttachmentScalarFieldEnumSchema = z.enum(['id','messageId','filePath','mimeType','fileSize','duration','createdAt']);

export default MessageAttachmentScalarFieldEnumSchema;
