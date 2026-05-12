import { z } from 'zod';

export const LikedProfileScalarFieldEnumSchema = z.enum(['id','fromId','toId','createdAt','isNew','isAnonymous']);

export default LikedProfileScalarFieldEnumSchema;
