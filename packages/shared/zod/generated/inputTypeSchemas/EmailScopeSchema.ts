import { z } from 'zod';

export const EmailScopeSchema = z.enum(['notifications','reminders','newsletter']);

export type EmailScopeType = `${z.infer<typeof EmailScopeSchema>}`

export default EmailScopeSchema;
