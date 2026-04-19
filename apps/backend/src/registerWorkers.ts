import { Worker, type Job } from 'bullmq'
import { appConfig } from '@/lib/appconfig'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { emailService } from '@/services/email/emailSender.service'
import type { EmailPayload } from '@/services/email/types'
import { processEmailJob } from '@/workers/emailWorker.processor'
import { processActivityDistillJob } from '@/workers/activityWorker'
import { processActivityFlushJob } from '@/workers/activityFlushWorker'
import {
  processOnboardingReminderJob,
  type OnboardingReminderJobData,
} from '@/workers/onboardingReminderWorker'

type ActivityFlushJobData = { profileId: string }

export function registerWorkers(): Worker[] {
  const connection = bullConnection

  const workers: Worker[] = [
    new Worker<EmailPayload>(
      'emails',
      async (job: Job<EmailPayload>) => {
        await processEmailJob(job.data, emailService, appConfig.EMAIL_FROM)
      },
      { connection }
    ),

    new Worker(
      'activity-distill',
      async () => {
        await processActivityDistillJob()
      },
      { connection }
    ),

    new Worker<ActivityFlushJobData>(
      'activity-flush',
      async (job: Job<ActivityFlushJobData>) => {
        const { profileId } = job.data
        if (!profileId) return
        await processActivityFlushJob(profileId)
      },
      { connection }
    ),

    new Worker<OnboardingReminderJobData>(
      'onboarding-reminder',
      async (job: Job<OnboardingReminderJobData>) => {
        await processOnboardingReminderJob(job)
      },
      { connection }
    ),
  ]

  for (const w of workers) {
    w.on('completed', (job) => {
      const ms = job.processedOn ? Date.now() - job.processedOn : undefined
      logger.info({ queue: w.name, jobId: job.id, name: job.name, ms }, 'job completed')
    })
    w.on('failed', (job, err) => {
      logger.error(
        { queue: w.name, jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, err: err.message },
        'job failed'
      )
    })
    w.on('error', (err) => {
      logger.error({ err: err.message }, 'worker error')
    })
  }

  logger.info({ queues: workers.map((w) => w.name) }, 'workers registered')

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'draining workers')
    const results = await Promise.allSettled(workers.map((w) => w.close()))
    const drained = results.filter((r) => r.status === 'fulfilled').length
    logger.info({ drained, total: workers.length }, 'workers drained')
    process.exit(0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  return workers
}
