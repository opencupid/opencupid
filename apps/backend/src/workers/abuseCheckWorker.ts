import type { Job } from 'bullmq'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { AbuseCheckService } from '@/services/abuseCheck.service'
import type { AbuseCheckJobData } from '@/queues/abuseCheckQueue'

export async function processAbuseCheckJob(job: Job<AbuseCheckJobData>): Promise<void> {
  const svc = AbuseCheckService.getInstance()
  const data = job.data

  if (data.kind === 'reconcile-one') {
    await svc.reconcileSpamBurst(data.profileId)
    await job.log(`reconciled ${data.profileId}`)
    return
  }

  const profiles = data.allProfiles
    ? await prisma.profile.findMany({
        where: { isActive: true },
        select: { id: true },
      })
    : await prisma.profile.findMany({
        where: { abuseFlags: { some: { clearedAt: null } } },
        select: { id: true },
      })

  let failed = 0
  for (const { id } of profiles) {
    try {
      await svc.reconcileSpamBurst(id)
    } catch (err) {
      failed += 1
      await job.log(
        `failed to reconcile ${id}: ${err instanceof Error ? err.message : String(err)}`
      )
      logger.warn({ err, profileId: id }, 'reconcileSpamBurst failed — skipping')
    }
  }
  await job.log(
    `reconciled ${profiles.length - failed} profile(s)${failed > 0 ? ` (${failed} failed)` : ''}`
  )
}
