import { z } from 'zod';

export const EventContentScalarFieldEnumSchema = z.enum(['userContentId','startsAt','venue','externalUrl']);

export default EventContentScalarFieldEnumSchema;
