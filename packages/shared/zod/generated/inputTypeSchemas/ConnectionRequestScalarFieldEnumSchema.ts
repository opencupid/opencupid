import { z } from 'zod';

export const ConnectionRequestScalarFieldEnumSchema = z.enum(['id','fromUserId','toUserId','scope','status','createdAt']);

export default ConnectionRequestScalarFieldEnumSchema;
