import { z } from 'zod';

export const ConversationParticipantScalarFieldEnumSchema = z.enum(['id','profileId','conversationId','lastReadAt','isMuted','isArchived','isCallable']);

export default ConversationParticipantScalarFieldEnumSchema;
