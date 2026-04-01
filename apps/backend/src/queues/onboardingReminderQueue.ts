import { appConfig } from '@/lib/appconfig'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
})

const REMINDER_CRON = '0 9 * * *' // daily at 09:00 UTC

export const onboardingReminderQueue = new Queue('onboarding-reminder', { connection })

/**
 * Register the repeatable onboarding-reminder job.
 * Safe to call on every startup — BullMQ deduplicates by scheduler ID.
 */
export async function registerOnboardingReminderJob(): Promise<void> {
  await onboardingReminderQueue.upsertJobScheduler(
    'onboarding-reminder',
    { pattern: REMINDER_CRON },
    { name: 'onboarding-reminder' }
  )
}
