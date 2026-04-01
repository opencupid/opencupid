import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { z } from 'zod'
import { appConfig } from '@/lib/appconfig'
import { sendOnboardingReminders } from '@/services/onboardingReminder.service'
import { registerOnboardingReminderJob } from '@/queues/onboardingReminderQueue'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Job data schema. All fields are optional.
 *
 * windowOffsetMs: how far back (in ms) the END of the 24h registration window sits
 *                relative to "now". Defaults to ONE_DAY_MS (1 day ago).
 *                Coerced from string to support Bull Board's manual trigger UI.
 *
 * The worker always scans a 24h window:
 *   windowStart = now - windowOffsetMs - ONE_DAY_MS
 *   windowEnd   = now - windowOffsetMs
 *
 * Examples:
 *   {}                            → users who registered 1–2 days ago  (default daily cron)
 *   { windowOffsetMs: 172800000 } → users who registered 2–3 days ago
 *   { windowOffsetMs: 259200000 } → users who registered 3–4 days ago
 *
 * To backfill several days, enqueue one job per day with increasing windowOffsetMs values.
 * BullMQ deduplicates via the deterministic jobId in the notifier, so re-runs are safe.
 */
export const jobDataSchema = z.object({
  windowOffsetMs: z.coerce.number().finite().nonnegative().default(ONE_DAY_MS),
})

type JobData = z.input<typeof jobDataSchema>

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker<JobData>(
  'onboarding-reminder',
  async (job) => {
    const { windowOffsetMs } = jobDataSchema.parse(job.data ?? {})
    const now = Date.now()
    const windowStart = new Date(now - windowOffsetMs - ONE_DAY_MS)
    const windowEnd = new Date(now - windowOffsetMs)
    await job.log(`Window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`)

    const count = await sendOnboardingReminders(
      windowStart,
      windowEnd,
      async (sent, total, userId) => {
        await job.updateProgress(Math.round((sent / total) * 100))
        await job.log(`[${sent}/${total}] queued reminder for user ${userId}`)
      }
    )

    await job.log(
      count > 0 ? `Done — ${count} reminder(s) queued` : 'No users matched — nothing sent'
    )
  },
  { connection }
)

// Register the repeatable job schedule on startup
registerOnboardingReminderJob().catch((err) => {
  console.error('Failed to register onboarding reminder job:', err)
})
