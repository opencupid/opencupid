import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { BoundsQuerySchema } from '@zod/dto/bounds.dto'
import { validateBody } from '@/utils/zodValidate'
import { rateLimitConfig, sendError } from '../helpers'
import type { UserContentService, ListOptions } from '@/services/userContent.service'

interface UserContentMappers<TRow, TDetailRow, TBoundsRow, TOwner, TPublic, TDetail, TSummary> {
  /**
   * Maps an owner-visible row. Accepts either the standard `TRow` (returned
   * by create/update/findByProfileId/etc.) or the wider `TDetailRow` from
   * findByIdWithContext, since the GET /:id route hands the detail row to
   * this mapper when the viewer owns the resource.
   */
  toOwner(raw: TRow | TDetailRow): TOwner
  toPublic(raw: TRow, viewerProfileId: string): TPublic
  toDetail(raw: TDetailRow, viewerProfileId: string): TDetail
  toSummary(raw: TBoundsRow): TSummary
}

/**
 * Schema slots accept any Zod schema whose parse output matches the expected
 * shape. We use `z.ZodType<Output, ZodTypeDef, unknown>` (rather than
 * `ZodSchema<T>` which requires input == output) so schemas with `.default()`,
 * `.coerce`, or other input/output divergences are accepted.
 */
interface UserContentSchemas<TCreatePayload, TUpdatePayload> {
  create: z.ZodType<TCreatePayload, z.ZodTypeDef, unknown>
  update: z.ZodType<TUpdatePayload, z.ZodTypeDef, unknown>
  params: z.ZodType<{ id: string }, z.ZodTypeDef, unknown>
  profileParams: z.ZodType<{ profileId: string }, z.ZodTypeDef, unknown>
  listQuery: z.ZodType<ListOptions, z.ZodTypeDef, unknown>
  nearbyQuery?: z.ZodType<
    ListOptions & { lat: number; lon: number; radius: number },
    z.ZodTypeDef,
    unknown
  >
}

export interface UserContentRouteConfig<
  TRow extends { postedById: string },
  TDetailRow extends { postedById: string },
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
  TOwner,
  TPublic,
  TDetail,
  TSummary,
> {
  service: UserContentService<TRow, TDetailRow, TBoundsRow, TCreatePayload, TUpdatePayload>
  mappers: UserContentMappers<TRow, TDetailRow, TBoundsRow, TOwner, TPublic, TDetail, TSummary>
  schemas: UserContentSchemas<TCreatePayload, TUpdatePayload>

  /** Wire response key per content type ('post' / 'event' / etc.). */
  wire: {
    singular: string
    plural: string
  }

  rateLimits?: {
    create?: { window: string; max: number }
    mutate?: { window: string; max: number }
  }

  features?: {
    nearby?: boolean
    recent?: boolean
    bounds?: boolean
    publicProfileList?: boolean
  }

  /** Side-effect after a successful create/update/delete (e.g. cluster cache eviction). */
  onMutation?: () => void | Promise<void>

  /** Resource label for 5xx error strings; defaults to wire.singular. */
  errorLabel?: string
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function makeUserContentRoutes<
  TRow extends { postedById: string },
  TDetailRow extends { postedById: string },
  TBoundsRow,
  TCreatePayload,
  TUpdatePayload,
  TOwner,
  TPublic,
  TDetail,
  TSummary,
>(
  config: UserContentRouteConfig<
    TRow,
    TDetailRow,
    TBoundsRow,
    TCreatePayload,
    TUpdatePayload,
    TOwner,
    TPublic,
    TDetail,
    TSummary
  >
): FastifyPluginAsync {
  const { service, mappers, schemas, wire } = config
  const label = config.errorLabel ?? wire.singular
  const rate = {
    create: config.rateLimits?.create ?? { window: '1 minute', max: 10 },
    mutate: config.rateLimits?.mutate ?? { window: '1 minute', max: 5 },
  }
  const features = {
    nearby: config.features?.nearby ?? !!service.findNearby,
    recent: config.features?.recent ?? !!service.findRecent,
    bounds: config.features?.bounds ?? !!service.findInBounds,
    publicProfileList: config.features?.publicProfileList ?? true,
  }

  return async (fastify) => {
    // POST /
    fastify.post(
      '/',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.create.window, rate.create.max),
      },
      async (req, reply) => {
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        const data = validateBody<TCreatePayload>(schemas.create, req, reply)
        if (!data) return

        try {
          const created = await service.create(profileId, data)
          await config.onMutation?.()
          return reply.code(201).send({ success: true, [wire.singular]: mappers.toOwner(created) })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to create ${label}`)
        }
      }
    )

    // GET /:id  — owner-vs-public branching
    fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const { id } = schemas.params.parse(req.params)
      const viewerProfileId = req.session.profileId

      try {
        const raw = await service.findByIdWithContext(id, viewerProfileId)
        if (!raw) return sendError(reply, 404, `${capitalize(label)} not found`)

        const isOwner = raw.postedById === viewerProfileId
        const item = isOwner ? mappers.toOwner(raw) : mappers.toDetail(raw, viewerProfileId)

        return reply.code(200).send({ success: true, [wire.singular]: item })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch ${label}`)
      }
    })

    // PATCH /:id
    fastify.patch(
      '/:id',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.mutate.window, rate.mutate.max),
      },
      async (req, reply) => {
        const { id } = schemas.params.parse(req.params)
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        const data = validateBody<TUpdatePayload>(schemas.update, req, reply)
        if (!data) return

        try {
          const raw = await service.update(id, profileId, data)
          if (!raw) return sendError(reply, 404, `${capitalize(label)} not found or access denied`)
          await config.onMutation?.()
          return reply.code(200).send({ success: true, [wire.singular]: mappers.toOwner(raw) })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to update ${label}`)
        }
      }
    )

    // DELETE /:id
    fastify.delete(
      '/:id',
      {
        onRequest: [fastify.authenticate],
        config: rateLimitConfig(fastify, rate.mutate.window, rate.mutate.max),
      },
      async (req, reply) => {
        const { id } = schemas.params.parse(req.params)
        const profileId = req.session.profileId
        if (!profileId) return sendError(reply, 401, 'Profile required')

        try {
          const result = await service.delete(id, profileId)
          if (!result)
            return sendError(reply, 404, `${capitalize(label)} not found or access denied`)
          await config.onMutation?.()
          return reply.code(200).send({ success: true })
        } catch (err: any) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to delete ${label}`)
        }
      }
    )

    // GET /
    fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const query = schemas.listQuery.parse(req.query)
      try {
        const raw = await service.findAll(query)
        const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
        return reply.code(200).send({ success: true, [wire.plural]: items })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch ${wire.plural}`)
      }
    })

    // GET /nearby
    if (features.nearby && service.findNearby && schemas.nearbyQuery) {
      const nearbyQuery = schemas.nearbyQuery
      const findNearby = service.findNearby
      fastify.get('/nearby', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const query = nearbyQuery.parse(req.query)
        try {
          const raw = await findNearby.call(service, query.lat, query.lon, query.radius, query)
          const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch nearby ${wire.plural}`)
        }
      })
    }

    // GET /recent
    if (features.recent && service.findRecent) {
      const findRecent = service.findRecent
      fastify.get('/recent', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const query = schemas.listQuery.parse(req.query)
        try {
          const raw = await findRecent.call(service, query)
          const items = raw.map((r) => mappers.toPublic(r, req.session.profileId))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch recent ${wire.plural}`)
        }
      })
    }

    // GET /bounds
    if (features.bounds && service.findInBounds) {
      const findInBounds = service.findInBounds
      fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const parsed = BoundsQuerySchema.safeParse(req.query)
        if (!parsed.success) {
          return sendError(
            reply,
            400,
            'Missing or invalid bounds parameters (south, north, west, east)'
          )
        }
        try {
          const raw = await findInBounds.call(service, parsed.data)
          const items = raw.map((r) => mappers.toSummary(r))
          return reply.code(200).send({ success: true, [wire.plural]: items })
        } catch (err) {
          fastify.log.error(err)
          return sendError(reply, 500, `Failed to fetch ${wire.plural} in bounds`)
        }
      })
    }

    // GET /profile/:profileId
    if (features.publicProfileList) {
      fastify.get(
        '/profile/:profileId',
        { onRequest: [fastify.authenticate] },
        async (req, reply) => {
          const { profileId } = schemas.profileParams.parse(req.params)
          const viewerProfileId = req.session.profileId
          const query = schemas.listQuery.parse(req.query)
          try {
            const raw = await service.findByProfileId(profileId, {
              ...query,
              includeInvisible: viewerProfileId === profileId,
            })
            const items = raw.map((r) => mappers.toPublic(r, viewerProfileId))
            return reply.code(200).send({ success: true, [wire.plural]: items })
          } catch (err) {
            fastify.log.error(err)
            return sendError(reply, 500, `Failed to fetch profile ${wire.plural}`)
          }
        }
      )
    }

    // GET /profile/me
    fastify.get('/profile/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
      const profileId = req.session.profileId
      if (!profileId) return sendError(reply, 401, 'Profile required')
      const query = schemas.listQuery.parse(req.query)
      try {
        const raw = await service.findByProfileId(profileId, {
          ...query,
          includeInvisible: true,
        })
        const items = raw.map((r) => mappers.toOwner(r))
        return reply.code(200).send({ success: true, [wire.plural]: items })
      } catch (err) {
        fastify.log.error(err)
        return sendError(reply, 500, `Failed to fetch profile ${wire.plural}`)
      }
    })
  }
}
