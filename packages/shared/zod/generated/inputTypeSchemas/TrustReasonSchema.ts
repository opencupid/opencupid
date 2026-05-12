import { z } from 'zod';

export const TrustReasonSchema = z.enum(['PROFILE_UNVETTED','SPAM_BURST']);

export type TrustReasonType = `${z.infer<typeof TrustReasonSchema>}`

export default TrustReasonSchema;
