import { z } from 'zod'
import {
  LeanUserContentSchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'

const EVENT_KIND = z.literal('event')

export const PublicEventSchema = LeanUserContentSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.date(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.date(),
})
export type PublicEventDetail = z.infer<typeof PublicEventDetailSchema>

export const OwnerEventSchema = PublicEventSchema.extend({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
  updatedAt: z.date(),
})
export type OwnerEvent = z.infer<typeof OwnerEventSchema>

export const CreateEventPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  startsAt: z.coerce.date(),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
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
