import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import {
  AdminCreateEventPayloadSchema,
  AdminExternalEventQuerySchema,
  EventParamsSchema,
  type AdminCreateEventPayload,
  type AdminExternalEvent,
} from '@zod/event/event.dto'
import { EventService } from '@/services/event.service'
import { ClusterService } from '@/services/cluster.service'
import { ImageServiceError } from '@/services/image.service'
import { TagServiceError } from '@/services/tag.service'
import { validateBody } from '@/utils/zodValidate'
import { sendError } from '../../helpers'

/**
 * Admin event endpoints used by external feed importers. Deliberately dumb:
 * importers own all feed processing and decide what to create or delete.
 */
const adminEventRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = EventService.getInstance()
  const cluster = ClusterService.getInstance()

  /**
   * GET /?externalSource=<source>
   * Lists events imported from the given source, including poster-deleted ones.
   * @returns {{ success, events: AdminExternalEvent[] }}
   */
  fastify.get('/', async (req, reply) => {
    const query = AdminExternalEventQuerySchema.safeParse(req.query)
    if (!query.success) return sendError(reply, 400, 'externalSource is required')
    try {
      const events: AdminExternalEvent[] = await svc.findByExternalSource(query.data.externalSource)
      return reply.code(200).send({ success: true, events })
    } catch (err) {
      fastify.log.error({ err }, 'Error listing external events')
      return sendError(reply, 500, 'Failed to list events')
    }
  })

  /**
   * POST /
   * Creates an event on behalf of `postedById`. Images must have been uploaded
   * for that profile via POST /admin/images first.
   * @returns {{ success, id }} 201, 409 when externalSource+externalId already exists
   */
  fastify.post('/', async (req, reply) => {
    const data = validateBody<AdminCreateEventPayload>(AdminCreateEventPayloadSchema, req, reply)
    if (!data) return
    const { postedById, externalSource, externalId, ...payload } = data
    try {
      const created = await svc.create(postedById, payload, {
        source: externalSource,
        id: externalId,
      })
      cluster.evictAll()
      return reply.code(201).send({ success: true, id: created.id })
    } catch (err) {
      if (err instanceof ImageServiceError || err instanceof TagServiceError) {
        return sendError(reply, 400, err.message)
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') return sendError(reply, 409, 'Event already imported')
        if (err.code === 'P2003') return sendError(reply, 400, 'Unknown postedById')
      }
      fastify.log.error({ err }, 'Error creating admin event')
      return sendError(reply, 500, 'Failed to create event')
    }
  })

  /**
   * DELETE /:id
   * Soft-deletes an event regardless of its poster and releases its external ref.
   * @returns {{ success }} 200, 404 when not found or already deleted
   */
  fastify.delete('/:id', async (req, reply) => {
    const params = EventParamsSchema.safeParse(req.params)
    if (!params.success) return sendError(reply, 400, 'Invalid event id')
    try {
      const deleted = await svc.adminSoftDelete(params.data.id)
      if (!deleted) return sendError(reply, 404, 'Event not found')
      cluster.evictAll()
      return reply.code(200).send({ success: true })
    } catch (err) {
      fastify.log.error({ err }, 'Error deleting admin event')
      return sendError(reply, 500, 'Failed to delete event')
    }
  })
}

export default adminEventRoutes
