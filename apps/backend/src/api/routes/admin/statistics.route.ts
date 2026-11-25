import type { FastifyPluginAsync } from 'fastify'
import { AdminStatisticsQuerySchema, type AdminStatisticsResponse } from '@zod/admin/statistics.dto'
import { StatisticsService } from '@/services/statistics.service'
import { sendError } from '../../helpers'

const adminStatisticsRoutes: FastifyPluginAsync = async (fastify) => {
  const svc = StatisticsService.getInstance()

  /**
   * GET /
   * Composition of the active member base: age, gender, family situation and
   * mutual dating matches.
   * @query {string} [origin] - Only members of this brand domain
   * @query {ActivitySegment} [segment] - Only members in this activity segment
   * @returns {{ success, statistics: AdminStatistics }}
   */
  fastify.get('/', async (req, reply) => {
    const query = AdminStatisticsQuerySchema.safeParse(req.query)
    if (!query.success) return sendError(reply, 400, 'Invalid filter')
    try {
      const response: AdminStatisticsResponse = {
        success: true,
        statistics: await svc.getStatistics(query.data),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error({ err }, 'Error computing member statistics')
      return sendError(reply, 500, 'Failed to compute statistics')
    }
  })
}

export default adminStatisticsRoutes
