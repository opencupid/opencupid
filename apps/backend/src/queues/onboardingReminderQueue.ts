import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

const REMINDER_CRON = '0 9 * * *' // daily at 09:00 UTC

export const onboardingReminderQueue = new Queue('onboarding-reminder', {
  connection: bullConnection,
})

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
  logger.info({ queue: 'onboarding-reminder', pattern: REMINDER_CRON }, 'cron registered')
}
