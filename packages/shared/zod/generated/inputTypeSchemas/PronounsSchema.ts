import { z } from 'zod';

export const PronounsSchema = z.enum(['he_him','she_her','they_them','unspecified']);

export type PronounsType = `${z.infer<typeof PronounsSchema>}`

export default PronounsSchema;
