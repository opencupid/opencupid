import { z } from 'zod';

export const RelationshipStatusSchema = z.enum(['single','in_relationship','married','divorced','widowed','other','unspecified']);

export type RelationshipStatusType = `${z.infer<typeof RelationshipStatusSchema>}`

export default RelationshipStatusSchema;
