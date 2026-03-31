import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { Prisma } from '@prisma/client'
import { appConfig } from '@/lib/appconfig'
import { prisma } from '@/lib/prisma'

const SESSION_GAP_MS = 30 * 60 * 1000

/**
 * Core logic: gap-check against DB, write ProfileSessionLog if needed.
 * Exported for unit testing.
 */
export async function processActivityFlushJob(profileId: string): Promise<void> {
  const last = await prisma.profileSessionLog.findFirst({
    where: { profileId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  })

  const now = new Date()
  if (last && now.getTime() - last.startedAt.getTime() < SESSION_GAP_MS) {
    return
  }

  try {
    await prisma.profileSessionLog.create({
      data: { profileId, startedAt: now },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return
    }
    throw err
  }
}

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker(
  'activity-flush',
  async (job) => {
    const { profileId } = job.data as { profileId: string }
    if (!profileId) return
    await processActivityFlushJob(profileId)
  },
  { connection }
)
