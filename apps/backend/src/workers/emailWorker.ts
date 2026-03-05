import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { emailService } from '@/services/email/emailSender.service'

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

new Worker(
  'emails',
  async (job) => {
    const {
      to,
      subject,
      publicName,
      callToActionLabel,
      callToActionUrl,
      contentBody,
      siteName,
      footer,
    } = job.data as {
      to: string
      subject: string
      publicName: string
      callToActionLabel: string
      callToActionUrl: string
      contentBody: string
      siteName: string
      footer: string
    }

    await emailService.sendMail(
      to,
      subject,
      publicName,
      callToActionLabel,
      callToActionUrl,
      contentBody,
      siteName,
      footer,
      appConfig.EMAIL_FROM
    )
  },
  { connection }
)
