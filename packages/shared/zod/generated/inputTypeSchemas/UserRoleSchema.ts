import { z } from 'zod';

export const UserRoleSchema = z.enum(['user','user_dating','admin','moderator']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export default UserRoleSchema;
