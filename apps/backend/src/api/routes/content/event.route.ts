import type { FastifyPluginAsync } from 'fastify'
import { EventService } from '@/services/event.service'
import { ClusterService } from '@/services/cluster.service'
import {
  CreateEventPayloadSchema,
  UpdateEventPayloadSchema,
  EventParamsSchema,
  type CreateEventPayload,
  type UpdateEventPayload,
} from '@zod/event/event.dto'
import { PaginationSchema } from '@zod/userContent/userContent.dto'
import { z } from 'zod'
import { mapDbEventToOwner, mapDbEventToDetail } from '../../mappers/event.mappers'
import { rateLimitConfig, sendError } from '../../helpers'
import { validateBody } from '@/utils/zodValidate'

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
      const event = isOwner
        ? mapDbEventToOwner(row as any)
        : mapDbEventToDetail(row, viewerProfileId)
      return reply.code(200).send({ success: true, event })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch event')
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
      const rows = await svc.findByProfileIdHydrated(profileId, {
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
      const rows = await svc.findByProfileIdHydrated(profileId, {
        ...page,
        includeInvisible: viewerProfileId === profileId,
      })
      const events = rows.map((r) =>
        viewerProfileId === profileId
          ? mapDbEventToOwner(r)
          : mapDbEventToDetail(r as any, viewerProfileId)
      )
      return reply.code(200).send({ success: true, events })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile events')
    }
  })
}

export default eventRoutes
