import { z } from 'zod';

export const ImageAttachmentScalarFieldEnumSchema = z.enum(['imageId','profileId','userContentId','position','isRestricted']);

export default ImageAttachmentScalarFieldEnumSchema;
