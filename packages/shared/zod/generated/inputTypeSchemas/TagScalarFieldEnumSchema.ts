import { z } from 'zod';

export const TagScalarFieldEnumSchema = z.enum(['id','slug','name','originalLocale','isUserCreated','isApproved','isHidden','isDeleted','createdBy','createdAt','updatedAt']);

export default TagScalarFieldEnumSchema;
