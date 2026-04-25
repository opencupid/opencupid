// apps/backend/src/plugins/bull-board.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { emailQueue } from '../queues/emailQueue'
import { activityQueue } from '../queues/activityQueue'
import { activityFlushQueue } from '../queues/activityFlushQueue'
import { onboardingReminderQueue } from '../queues/onboardingReminderQueue'
import { profileTrustQueue } from '../queues/profileTrustQueue'

const bullBoardPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Guard: only allow requests that passed nginx mTLS admin proxy
  fastify.addHook('onRequest', async (req, reply) => {
    if (req.headers['x-admin-authenticated'] !== 'true') {
      return reply.code(403).send({ success: false, message: 'Forbidden' })
    }
  })

  const serverAdapter = new FastifyAdapter()

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(activityQueue),
      new BullMQAdapter(activityFlushQueue),
      new BullMQAdapter(onboardingReminderQueue),
      new BullMQAdapter(profileTrustQueue),
    ],
    serverAdapter,
  })

  serverAdapter.setBasePath('/bull-board')

  fastify.register(serverAdapter.registerPlugin(), { prefix: '/' })
}

export default bullBoardPlugin
