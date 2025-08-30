import { FastifyPluginAsync } from 'fastify'
import z from 'zod'
import { sendError } from '../helpers'

const createBody = z.object({
  room: z.string(),
  targetProfileId: z.string().cuid(),
})

const latestQuery = z.object({
  withProfileId: z.string().cuid(),
})

const idParams = z.object({
  id: z.string().cuid(),
})

const meetingRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile not found.')
    const body = createBody.safeParse(req.body)
    if (!body.success) return sendError(reply, 400, 'Invalid payload')
    try {
      const meeting = await fastify.prisma.meeting.create({
        data: {
          room: body.data.room,
          createdById: profileId,
          targetProfileId: body.data.targetProfileId,
        },
      })
      return reply.code(200).send({ success: true, meeting })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to create meeting')
    }
  })

  fastify.get('/latest', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const profileId = req.session.profileId
    if (!profileId) return sendError(reply, 401, 'Profile not found.')
    const query = latestQuery.safeParse(req.query)
    if (!query.success) return sendError(reply, 400, 'Invalid query')
    try {
      const meeting = await fastify.prisma.meeting.findFirst({
        where: {
          endedAt: null,
          OR: [
            { createdById: profileId, targetProfileId: query.data.withProfileId },
            { createdById: query.data.withProfileId, targetProfileId: profileId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
      return reply.code(200).send({ success: true, meeting: meeting ?? null })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch meeting')
    }
  })

  fastify.post('/:id/end', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const params = idParams.safeParse(req.params)
    if (!params.success) return sendError(reply, 400, 'Invalid meeting id')
    try {
      const meeting = await fastify.prisma.meeting.update({
        where: { id: params.data.id },
        data: { endedAt: new Date() },
      })
      return reply.code(200).send({ success: true, meeting })
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to end meeting')
    }
  })
}

export default meetingRoutes
