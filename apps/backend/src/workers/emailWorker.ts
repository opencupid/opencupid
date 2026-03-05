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
    const { to, subject, publicName, callToActionLabel, callToActionUrl, contentBody } =
      job.data as {
        to: string
        subject: string
        publicName: string
        callToActionLabel: string
        callToActionUrl: string
        contentBody: string
      }

    await emailService.sendMail(
      to,
      subject,
      publicName,
      callToActionLabel,
      callToActionUrl,
      contentBody,
      appConfig.EMAIL_FROM
    )
  },
  { connection }
)
