import { z } from 'zod';

export const CommunityContentScalarFieldEnumSchema = z.enum(['userContentId','yearFounded','contactUrl','contactEmail']);

export default CommunityContentScalarFieldEnumSchema;
