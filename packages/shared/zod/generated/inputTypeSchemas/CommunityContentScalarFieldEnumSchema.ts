import { z } from 'zod';

export const CommunityContentScalarFieldEnumSchema = z.enum(['userContentId','yearFounded','description','contactUrl','contactEmail']);

export default CommunityContentScalarFieldEnumSchema;
