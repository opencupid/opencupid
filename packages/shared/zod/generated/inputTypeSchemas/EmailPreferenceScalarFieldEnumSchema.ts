import { z } from 'zod';

export const EmailPreferenceScalarFieldEnumSchema = z.enum(['userId','scope','granted','source','updatedAt']);

export default EmailPreferenceScalarFieldEnumSchema;
