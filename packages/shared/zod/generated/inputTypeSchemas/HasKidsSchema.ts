import { z } from 'zod';

export const HasKidsSchema = z.enum(['yes','no','unspecified']);

export type HasKidsType = `${z.infer<typeof HasKidsSchema>}`

export default HasKidsSchema;
