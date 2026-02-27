import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { distillActivitySegments } from '@/services/activityDistill.service'
import { registerDistillJob } from '@/queues/activityQueue'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker(
  'activity-distill',
  async () => {
    await distillActivitySegments()
  },
  { connection }
)

// Register the repeatable job schedule on startup
registerDistillJob().catch((err) => {
  console.error('Failed to register activity distill job:', err)
})
