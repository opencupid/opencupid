import { z } from 'zod';

export const ProfileImageScalarFieldEnumSchema = z.enum(['id','userId','profileId','position','altText','storagePath','url','width','height','mimeType','createdAt','updatedAt','contentHash','blurhash','isModerated','isFlagged','hasFace']);

export default ProfileImageScalarFieldEnumSchema;
