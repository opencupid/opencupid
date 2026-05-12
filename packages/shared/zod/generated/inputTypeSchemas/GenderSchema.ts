import { z } from 'zod';

export const GenderSchema = z.enum(['male','female','agender','androgynous','bigender','cis_man','cis_woman','genderfluid','genderqueer','gender_nonconforming','hijra','intersex','pangender','transfeminine','trans_man','transmasculine','transsexual','trans_woman','two_spirit','non_binary','other','unspecified']);

export type GenderType = `${z.infer<typeof GenderSchema>}`

export default GenderSchema;
