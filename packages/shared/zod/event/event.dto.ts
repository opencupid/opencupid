import { z } from 'zod'
import {
  BaseUserContentPayloadSchema,
  UserContentMetadataSchema,
  OwnerUserContentOverlaySchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'

const EVENT_KIND = z.literal('event')

export const PublicEventSchema = UserContentMetadataSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
})
export type PublicEventDetail = z.infer<typeof PublicEventDetailSchema>

export const OwnerEventSchema = PublicEventSchema.merge(OwnerUserContentOverlaySchema)
export type OwnerEvent = z.infer<typeof OwnerEventSchema>

export const CreateEventPayloadSchema = BaseUserContentPayloadSchema.extend({
  startsAt: z.coerce.date(),
})
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>

export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>

export const EventParamsSchema = z.object({ id: z.string().cuid() })

export const EventQuerySchema = z.object(UserContentQueryShape)
export type EventQuery = z.infer<typeof EventQuerySchema>
export type EventQueryInput = z.input<typeof EventQuerySchema>

export const NearbyEventQuerySchema = z.object(NearbyContentQueryShape)
export type NearbyEventQuery = z.infer<typeof NearbyEventQuerySchema>
export type NearbyEventQueryInput = z.input<typeof NearbyEventQuerySchema>
