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

// Legacy email job format for backward compatibility
interface LegacyEmailJob {
  to: string
  subject: string
  html: string
}

// New email job format using TxPayload
interface EmailJob {
  type: 'legacy' | 'transactional'
  payload: LegacyEmailJob | TxPayload
}

new Worker(
  'emails',
  async job => {
    const jobData = job.data as EmailJob | LegacyEmailJob

    // Handle backward compatibility - if it's the old format, treat as legacy
    if ('to' in jobData && 'subject' in jobData && 'html' in jobData) {
      // Legacy format: convert to TxPayload
      const legacyData = jobData as LegacyEmailJob
      const txPayload: TxPayload = {
        to: [{ email: legacyData.to }],
        templateId: 0, // Dummy template ID for direct content
        data: {
          subject: legacyData.subject,
          html: legacyData.html,
        },
      }
      await emailProvider.sendTransactional(txPayload)
    } else {
      // New format
      const emailJobData = jobData as EmailJob
      if (emailJobData.type === 'legacy') {
        const legacyPayload = emailJobData.payload as LegacyEmailJob
        const txPayload: TxPayload = {
          to: [{ email: legacyPayload.to }],
          templateId: 0, // Dummy template ID for direct content
          data: {
            subject: legacyPayload.subject,
            html: legacyPayload.html,
          },
        }
        await emailProvider.sendTransactional(txPayload)
      } else {
        // Transactional format
        await emailProvider.sendTransactional(emailJobData.payload as TxPayload)
      }
    }
  },
  { connection }
)
