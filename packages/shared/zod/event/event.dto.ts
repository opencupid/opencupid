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
  externalUrl: z.string().nullable(),
})
export type PublicEvent = z.infer<typeof PublicEventSchema>

export const PublicEventDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: EVENT_KIND,
  startsAt: z.coerce.date(),
  venue: z.string().nullable(),
  externalUrl: z.string().nullable(),
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

const EXTERNAL_SOURCE_MAX_LENGTH = 50
const EXTERNAL_ID_MAX_LENGTH = 100
const EXTERNAL_URL_MAX_LENGTH = 2048

/**
 * Admin import: creates an event on behalf of `postedById`, keyed by the
 * item's id at an external feed so repeated imports cannot duplicate it.
 */
export const AdminCreateEventPayloadSchema = CreateEventPayloadSchema.extend({
  postedById: z.string().cuid(),
  externalSource: z.string().min(1).max(EXTERNAL_SOURCE_MAX_LENGTH),
  externalId: z.string().min(1).max(EXTERNAL_ID_MAX_LENGTH),
  externalUrl: z.string().url().max(EXTERNAL_URL_MAX_LENGTH),
})
export type AdminCreateEventPayload = z.infer<typeof AdminCreateEventPayloadSchema>

export const AdminExternalEventQuerySchema = z.object({
  externalSource: z.string().min(1).max(EXTERNAL_SOURCE_MAX_LENGTH),
})

export const AdminExternalEventSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  startsAt: z.coerce.date(),
  /** Deleted by its poster; importers must not recreate it. */
  isDeleted: z.boolean(),
})
export type AdminExternalEvent = z.infer<typeof AdminExternalEventSchema>

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
  startsAt: z.coerce.date(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type EventSummary = z.infer<typeof EventSummarySchema>

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

export const AttendeeListResponseSchema = z.object({
  success: z.literal(true),
  attendees: z.array(AttendeeSchema),
})
export type AttendeeListResponse = z.infer<typeof AttendeeListResponseSchema>
