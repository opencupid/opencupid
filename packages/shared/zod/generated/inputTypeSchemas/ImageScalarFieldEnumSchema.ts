import { z } from 'zod';

export const ImageScalarFieldEnumSchema = z.enum(['id','userId','position','altText','storagePath','url','width','height','mimeType','createdAt','updatedAt','contentHash','blurhash','isModerated','isFlagged','hasFace']);

export default ImageScalarFieldEnumSchema;
