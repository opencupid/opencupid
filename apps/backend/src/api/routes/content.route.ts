import type { FastifyPluginAsync } from 'fastify'
import { UserContentService } from '@/services/userContent.service'
import { PostService } from '@/services/post.service'
import { EventService } from '@/services/event.service'
import { mapLeanContent } from '../mappers/userContent.mappers'
import { mapDbPostToOwner, mapDbPostToDetail } from '../mappers/post.mappers'
import { mapDbEventToOwner, mapDbEventToDetail } from '../mappers/event.mappers'
import {
  UserContentQuerySchema,
  NearbyContentQuerySchema,
  ContentParamsSchema,
} from '@zod/userContent/userContent.dto'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { sendError } from '../helpers'

const contentRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = UserContentService.getInstance()

  fastify.get('/feed', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = UserContentQuerySchema.parse(req.query)
    const rows = await svc.findFeed(query)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) return sendError(reply, 400, 'Invalid bounds')
    const rows = await svc.findInBounds(parsed.data)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const q = NearbyContentQuerySchema.parse(req.query)
    const rows = await svc.findNearby(q.lat, q.lon, q.radius, q)
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/profile/:profileId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { profileId } = req.params as { profileId: string }
    const q = UserContentQuerySchema.parse(req.query)
    const rows = await svc.findByProfileId(profileId, {
      ...q,
      includeInvisible: req.session.profileId === profileId,
    })
    const items = rows.map((r) => mapLeanContent(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = ContentParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    const lean = await svc.findByIdLean(id, viewerProfileId)
    if (!lean) return sendError(reply, 404, 'Content not found')

    const isOwner = lean.postedById === viewerProfileId

    if (lean.kind === 'post') {
      const hydrated = await PostService.getInstance().findByIdHydrated(id, viewerProfileId)
      if (!hydrated) return sendError(reply, 404, 'Content not found')
      const item = isOwner
        ? mapDbPostToOwner(hydrated as any)
        : mapDbPostToDetail(hydrated as any, viewerProfileId)
      return reply.code(200).send({ success: true, item })
    }

    const hydrated = await EventService.getInstance().findByIdHydrated(id, viewerProfileId)
    if (!hydrated) return sendError(reply, 404, 'Content not found')
    const item = isOwner
      ? mapDbEventToOwner(hydrated as any)
      : mapDbEventToDetail(hydrated as any, viewerProfileId)
    return reply.code(200).send({ success: true, item })
  })
}

export default contentRoutes
