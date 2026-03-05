import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { emailService } from '@/services/email/emailSender.service'
import type { EmailPayload } from '@/services/email/types'
import { processEmailJob } from './emailWorker.processor'

const redisUrl = appConfig.REDIS_URL

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

new Worker(
  'emails',
  async (job) => {
    await processEmailJob(job.data as EmailPayload, emailService, appConfig.EMAIL_FROM)
  },
  { connection }
)
