import { z } from 'zod';

export const HiddenProfileScalarFieldEnumSchema = z.enum(['id','fromId','toId','createdAt']);

export default HiddenProfileScalarFieldEnumSchema;
