import { z } from 'zod';

export const UserContentScalarFieldEnumSchema = z.enum(['id','kind','postedById','content','isDeleted','isVisible','country','cityName','lat','lon','externalSource','externalId','createdAt','updatedAt']);

export default UserContentScalarFieldEnumSchema;
