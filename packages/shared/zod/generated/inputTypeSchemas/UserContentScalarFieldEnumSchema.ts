import { z } from 'zod';

export const UserContentScalarFieldEnumSchema = z.enum(['id','kind','postedById','content','isDeleted','isVisible','country','cityName','lat','lon','createdAt','updatedAt']);

export default UserContentScalarFieldEnumSchema;
