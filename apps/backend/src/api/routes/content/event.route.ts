import type { FastifyPluginAsync } from 'fastify'
import { createEvent as createIcsEvent, type EventAttributes } from 'ics'
import { EventService, EventNotVisibleError } from '@/services/event.service'
import { ClusterService } from '@/services/cluster.service'
import { ImageServiceError } from '@/services/image.service'
import {
  CreateEventPayloadSchema,
  UpdateEventPayloadSchema,
  EventParamsSchema,
  RsvpPayloadSchema,
  AttendeeListQuerySchema,
  type CreateEventPayload,
  type UpdateEventPayload,
  type RsvpPayload,
} from '@zod/event/event.dto'
import { PaginationSchema } from '@zod/userContent/userContent.dto'
import { z, ZodError } from 'zod'
import { mapDbEventToOwner, mapDbEventToDetail } from '../../mappers/event.mappers'
import { mapProfileSummary } from '../../mappers/profile.mappers'
import { rateLimitConfig, sendError } from '../../helpers'
import { validateBody } from '@/utils/zodValidate'

const ICS_DEFAULT_DURATION_HOURS = 2

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = EventService.getInstance()
  const cluster = ClusterService.getInstance()

  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<CreateEventPayload>(CreateEventPayloadSchema, req, reply)
      if (!data) return
      try {
        const created = await svc.create(profileId, data)
        cluster.evictAll()
        return reply.code(201).send({ success: true, event: mapDbEventToOwner(created) })
      } catch (err) {
        if (err instanceof ImageServiceError) {
          return sendError(reply, 400, err.message)
        }
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to create event')
      }
    }
  )

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = EventParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    try {
      const row = await svc.findByIdHydrated(id, viewerProfileId)
      if (!row) return sendError(reply, 404, 'Event not found')
      const isOwner = row.postedById === viewerProfileId
      const event = isOwner ? mapDbEventToOwner(row) : mapDbEventToDetail(row, viewerProfileId)
      return reply.code(200).send({ success: true, event })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch event')
    }
  })

  fastify.get('/:id/ics', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = EventParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    if (!viewerProfileId) return sendError(reply, 401, 'Profile required')
    try {
      const row = await svc.findByIdHydrated(id, viewerProfileId)
      if (!row || !row.event) return sendError(reply, 404, 'Event not found')

      const startsAt = row.event.startsAt
      const attributes: EventAttributes = {
        uid: `${row.id}@opencupid`,
        productId: 'opencupid/ics',
        title: row.content.slice(0, 200),
        description: row.content,
        start: [
          startsAt.getUTCFullYear(),
          startsAt.getUTCMonth() + 1,
          startsAt.getUTCDate(),
          startsAt.getUTCHours(),
          startsAt.getUTCMinutes(),
        ],
        startInputType: 'utc',
        duration: { hours: ICS_DEFAULT_DURATION_HOURS },
        location: row.event.venue ?? row.cityName ?? undefined,
        organizer: row.postedBy?.publicName ? { name: row.postedBy.publicName } : undefined,
      }

      const { error, value } = createIcsEvent(attributes)
      if (error || !value) {
        fastify.log.error(error)
        return sendError(reply, 500, 'Failed to build calendar file')
      }

      return reply
        .code(200)
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="event-${row.id}.ics"`)
        .send(value)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to build calendar file')
    }
  })

  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = EventParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<UpdateEventPayload>(UpdateEventPayloadSchema, req, reply)
      if (!data) return
      try {
        const row = await svc.update(id, profileId, data)
        if (!row) return sendError(reply, 404, 'Event not found or access denied')
        cluster.evictAll()
        return reply.code(200).send({ success: true, event: mapDbEventToOwner(row) })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update event')
      }
    }
  )

  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = EventParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      try {
        const result = await svc.softDelete(id, profileId)
        if (!result) return sendError(reply, 404, 'Event not found or access denied')
        cluster.evictAll()
        return reply.code(200).send({ success: true })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to delete event')
      }
    }
  )

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile required')
    try {
      const page = PaginationSchema.parse(req.query)
      const rows = await svc.findByProfileIdHydrated(profileId, profileId, {
        ...page,
        includeInvisible: true,
      })
      return reply.code(200).send({ success: true, events: rows.map(mapDbEventToOwner) })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch own events')
    }
  })

  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { profileId } = ProfileParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    try {
      const page = PaginationSchema.parse(req.query)
      const rows = await svc.findByProfileIdHydrated(profileId, viewerProfileId, {
        ...page,
        includeInvisible: viewerProfileId === profileId,
      })
      const events = rows.map((r) =>
        viewerProfileId === profileId
          ? mapDbEventToOwner(r)
          : mapDbEventToDetail(r, viewerProfileId)
      )
      return reply.code(200).send({ success: true, events })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile events')
    }
  })

  fastify.post(
    '/:id/rsvp',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 30),
    },
    async (req, reply) => {
      const { id } = EventParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<RsvpPayload>(RsvpPayloadSchema, req, reply)
      if (!data) return
      try {
        await svc.rsvp(profileId, id, data.status)
        return reply.code(200).send({ success: true })
      } catch (err) {
        if (err instanceof EventNotVisibleError) {
          return sendError(reply, 404, 'Event not found')
        }
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to RSVP')
      }
    }
  )

  fastify.get('/:id/rsvp', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = EventParamsSchema.parse(req.params)
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile required')
    try {
      const row = await svc.getMyRsvp(profileId, id)
      return reply.code(200).send({
        success: true,
        status: row?.status ?? null,
      })
    } catch (err) {
      if (err instanceof EventNotVisibleError) {
        return sendError(reply, 404, 'Event not found')
      }
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch RSVP')
    }
  })

  fastify.delete(
    '/:id/rsvp',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 30),
    },
    async (req, reply) => {
      const { id } = EventParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      try {
        await svc.cancelRsvp(profileId, id)
        return reply.code(200).send({ success: true })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to cancel RSVP')
      }
    }
  )

  fastify.get('/:id/attendees', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = EventParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    if (!viewerProfileId) return sendError(reply, 401, 'Profile required')
    try {
      const { status } = AttendeeListQuerySchema.parse(req.query)
      const rows = await svc.listAttendees(viewerProfileId, id, status)
      const attendees = rows.map((r) => ({
        profile: mapProfileSummary(r.profile),
        status: r.status,
        rsvpedAt: r.rsvpedAt,
      }))
      return reply.code(200).send({ success: true, attendees })
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(reply, 400, 'Invalid query parameters')
      }
      if (err instanceof EventNotVisibleError) {
        return sendError(reply, 404, 'Event not found')
      }
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to list attendees')
    }
  })
}

export default eventRoutes
