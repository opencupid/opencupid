import { z } from 'zod'
import {
  BaseUserContentPayloadSchema,
  UserContentMetadataSchema,
  OwnerUserContentOverlaySchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import { ProfileSummarySchema } from '@zod/profile/profile.dto'
import { MAX_IMAGES_PER_GALLERY, OwnerImageSchema } from '../image/image.dto'

const EVENT_KIND = z.literal('event')

const VENUE_MAX_LENGTH = 120

export const PublicEventSchema = UserContentMetadataSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
})
export type PublicEventDetail = z.infer<typeof PublicEventDetailSchema>

export const OwnerEventSchema = PublicEventSchema.merge(OwnerUserContentOverlaySchema)
  .omit({ images: true })
  .extend({ images: z.array(OwnerImageSchema).default([]) })
export type OwnerEvent = z.infer<typeof OwnerEventSchema>

export const CreateEventPayloadSchema = BaseUserContentPayloadSchema.extend({
  startsAt: z.coerce.date(),
  venue: z.string().max(VENUE_MAX_LENGTH).nullable().optional(),
  imageIds: z.array(z.string().cuid()).max(MAX_IMAGES_PER_GALLERY).optional(),
})
export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>

export const UpdateEventPayloadSchema = CreateEventPayloadSchema.omit({ imageIds: true })
  .partial()
  .extend({
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

export const EventSummarySchema = z.object({
  id: z.string(),
  kind: EVENT_KIND,
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})

export const AttendanceStatusEnum = z.enum(['GOING', 'MAYBE'])
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>

export const RsvpPayloadSchema = z.object({
  status: AttendanceStatusEnum,
})
export type RsvpPayload = z.infer<typeof RsvpPayloadSchema>

export const AttendeeSchema = z.object({
  profile: ProfileSummarySchema,
  status: AttendanceStatusEnum,
  rsvpedAt: z.coerce.date(),
})
export type Attendee = z.infer<typeof AttendeeSchema>

export const AttendeeListQuerySchema = z.object({
  status: AttendanceStatusEnum.optional(),
})
export type AttendeeListQuery = z.infer<typeof AttendeeListQuerySchema>

export const MyRsvpResponseSchema = z.object({
  success: z.literal(true),
  status: AttendanceStatusEnum.nullable(),
})
export type MyRsvpResponse = z.infer<typeof MyRsvpResponseSchema>
