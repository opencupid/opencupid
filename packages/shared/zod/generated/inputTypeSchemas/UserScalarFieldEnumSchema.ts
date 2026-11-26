import { z } from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id','email','phonenumber','tokenVersion','loginToken','loginTokenExp','isActive','isBlocked','isRegistrationConfirmed','createdAt','updatedAt','lastLoginAt','language','originDomain','roles','isPushNotificationEnabled']);

export default UserScalarFieldEnumSchema;
