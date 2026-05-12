import { z } from 'zod';

export const ConversationScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','profileAId','profileBId','status','initiatorProfileId','jitsiRoomId']);

export default ConversationScalarFieldEnumSchema;
