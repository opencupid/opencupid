import type { FastifyPluginAsync } from 'fastify'
import { CommunityService } from '@/services/community.service'
import { ClusterService } from '@/services/cluster.service'
import {
  CreateCommunityPayloadSchema,
  UpdateCommunityPayloadSchema,
  CommunityParamsSchema,
  type CreateCommunityPayload,
  type UpdateCommunityPayload,
} from '@zod/community/community.dto'
import { PaginationSchema } from '@zod/userContent/userContent.dto'
import { z } from 'zod'
import { mapDbCommunityToOwner, mapDbCommunityToDetail } from '../../mappers/community.mappers'
import { rateLimitConfig, sendError } from '../../helpers'
import { validateBody } from '@/utils/zodValidate'

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

const communityRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = CommunityService.getInstance()
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
      const data = validateBody<CreateCommunityPayload>(CreateCommunityPayloadSchema, req, reply)
      if (!data) return
      try {
        const created = await svc.create(profileId, data)
        cluster.evictAll()
        return reply.code(201).send({ success: true, community: mapDbCommunityToOwner(created) })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to create community')
      }
    }
  )

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = CommunityParamsSchema.parse(req.params)
    const viewerProfileId = req.session.profileId
    try {
      const row = await svc.findByIdHydrated(id, viewerProfileId)
      if (!row) return sendError(reply, 404, 'Community not found')
      const isOwner = row.postedById === viewerProfileId
      const community = isOwner
        ? mapDbCommunityToOwner(row)
        : mapDbCommunityToDetail(row, viewerProfileId)
      return reply.code(200).send({ success: true, community })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch community')
    }
  })

  fastify.patch(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 5),
    },
    async (req, reply) => {
      const { id } = CommunityParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const data = validateBody<UpdateCommunityPayload>(UpdateCommunityPayloadSchema, req, reply)
      if (!data) return
      try {
        const row = await svc.update(id, profileId, data)
        if (!row) return sendError(reply, 404, 'Community not found or access denied')
        cluster.evictAll()
        return reply.code(200).send({ success: true, community: mapDbCommunityToOwner(row) })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to update community')
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
      const { id } = CommunityParamsSchema.parse(req.params)
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      try {
        const result = await svc.softDelete(id, profileId)
        if (!result) return sendError(reply, 404, 'Community not found or access denied')
        cluster.evictAll()
        return reply.code(200).send({ success: true })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, 'Failed to delete community')
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
      return reply.code(200).send({ success: true, communities: rows.map(mapDbCommunityToOwner) })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch own communities')
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
      const communities = rows.map((r) =>
        viewerProfileId === profileId
          ? mapDbCommunityToOwner(r)
          : mapDbCommunityToDetail(r, viewerProfileId)
      )
      return reply.code(200).send({ success: true, communities })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profile communities')
    }
  })
}

export default communityRoutes
