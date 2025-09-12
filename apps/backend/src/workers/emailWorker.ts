import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { createEmailProvider } from '@/services/providers/EmailProviderFactory'
import type { TxPayload } from '@/types/email.types'

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
const emailProvider = createEmailProvider()

// Email job format using TxPayload
interface EmailJob {
  type: 'legacy' | 'transactional'
  payload: TxPayload
}

new Worker(
  'emails',
  async job => {
    const jobData = job.data as EmailJob

    // All jobs now use TxPayload format with provider system
    await emailProvider.sendTransactional(jobData.payload)
  },
  { connection }
)
