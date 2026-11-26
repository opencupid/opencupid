import { z } from 'zod';

export const EmailPreferenceSourceSchema = z.enum(['default','settings','unsubscribe_link','data_migration']);

export type EmailPreferenceSourceType = `${z.infer<typeof EmailPreferenceSourceSchema>}`

export default EmailPreferenceSourceSchema;
