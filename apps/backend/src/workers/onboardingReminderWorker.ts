import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { sendOnboardingReminders } from '@/services/onboardingReminder.service'
import { registerOnboardingReminderJob } from '@/queues/onboardingReminderQueue'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker(
  'onboarding-reminder',
  async () => {
    const count = await sendOnboardingReminders()
    if (count > 0) {
      console.log(`Sent ${count} onboarding reminder(s)`)
    }
  },
  { connection }
)

// Register the repeatable job schedule on startup
registerOnboardingReminderJob().catch((err) => {
  console.error('Failed to register onboarding reminder job:', err)
})
