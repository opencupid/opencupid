import { Worker, type Job } from 'bullmq'
import { appConfig } from '@/lib/appconfig'
import { bullConnection } from '@/lib/redis'
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

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`[worker] received ${signal}, draining in-flight jobs…`)
    await Promise.allSettled(workers.map((w) => w.close()))
    process.exit(0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  return workers
}
