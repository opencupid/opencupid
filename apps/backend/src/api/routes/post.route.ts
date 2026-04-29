import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import { ClusterService } from '@/services/cluster.service'
import { PostService } from '@/services/post.service'
import {
  CreatePostPayloadSchema,
  UpdatePostPayloadSchema,
  PostParamsSchema,
  PostQuerySchema,
  NearbyPostQuerySchema,
} from '@zod/post/post.dto'
import {
  mapDbPostToOwner,
  mapDbPostToPublic,
  mapDbPostToDetail,
  mapPostSummary,
} from '../mappers/post.mappers'
import { makeUserContentRoutes } from './userContent.route-factory'

const ProfileParamsSchema = z.object({ profileId: z.string().cuid() })

/**
 * Wrapped in an outer plugin so PostService.getInstance() and ClusterService.getInstance()
 * are only resolved when the plugin is registered (not at module-load time). This keeps
 * test mocks of those services working.
 */
const postRoutes: FastifyPluginAsync = async (fastify, opts) => {
  const inner = makeUserContentRoutes({
    service: PostService.getInstance(),
    mappers: {
      toOwner: mapDbPostToOwner,
      toPublic: mapDbPostToPublic,
      toDetail: mapDbPostToDetail,
      toSummary: mapPostSummary,
    },
    schemas: {
      create: CreatePostPayloadSchema,
      update: UpdatePostPayloadSchema,
      params: PostParamsSchema,
      profileParams: ProfileParamsSchema,
      listQuery: PostQuerySchema,
      nearbyQuery: NearbyPostQuerySchema,
    },
    wire: { singular: 'post', plural: 'posts' },
    rateLimits: {
      create: { window: '1 minute', max: 10 },
      mutate: { window: '1 minute', max: 5 },
    },
    features: { nearby: true, recent: true, bounds: true, publicProfileList: true },
    onMutation: () => ClusterService.getInstance().evictAll(),
  })
  await inner(fastify, opts)
}

export default postRoutes
