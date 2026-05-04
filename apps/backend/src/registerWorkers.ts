import { Worker, type Job } from 'bullmq'
import Sentry from '@/lib/sentry'
import { appConfig } from '@/lib/appconfig'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { emailService } from '@/services/email/emailSender.service'
import type { EmailPayload } from '@/services/email/types'
import { processEmailJob } from '@/workers/emailWorker.processor'
import { processActivityDistillJob } from '@/workers/activityWorker'
import {
  processOnboardingReminderJob,
  type OnboardingReminderJobData,
} from '@/workers/onboardingReminderWorker'
import { processProfileTrustJob } from '@/workers/profileTrustWorker'
import type { ProfileTrustJobData } from '@/queues/profileTrustQueue'

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

    new Worker<OnboardingReminderJobData>(
      'onboarding-reminder',
      async (job: Job<OnboardingReminderJobData>) => {
        await processOnboardingReminderJob(job)
      },
      { connection }
    ),

    new Worker<ProfileTrustJobData>(
      'profile-trust',
      async (job: Job<ProfileTrustJobData>) => {
        await processProfileTrustJob(job)
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
      logger.warn({ queue: w.name, jobId: job?.id }, 'job failed')
      Sentry.captureException(err, {
        tags: { queue: w.name, jobName: job?.name },
        extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
      })
    })
    w.on('error', (err) => {
      Sentry.captureException(err, { tags: { queue: w.name } })
    })
  }

  logger.info({ queues: workers.map((w) => w.name) }, 'workers registered')

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'draining workers')
    const results = await Promise.allSettled(workers.map((w) => w.close()))
    const drained = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - drained
    logger.info({ drained, failed, total: workers.length }, 'workers drained')
    process.exit(failed > 0 ? 1 : 0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  return workers
}
