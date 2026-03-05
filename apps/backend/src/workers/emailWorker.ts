import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { emailService } from '@/services/email/emailSender.service'

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

type LegacyEmailJobData = {
  to: string
  subject: string
  html: string
}

type EmailJobData = {
  to: string
  subject: string
  publicName: string
  callToActionLabel: string
  callToActionUrl: string
  contentBody: string
  siteName: string
  footer: string
}

function isLegacyEmailJob(data: unknown): data is LegacyEmailJobData {
  const d = data as LegacyEmailJobData
  return typeof d.html === 'string' && typeof d.to === 'string' && typeof d.subject === 'string'
}

new Worker(
  'emails',
  async (job) => {
    const data = job.data as LegacyEmailJobData | EmailJobData

    if (isLegacyEmailJob(data)) {
      // Backward compatibility: handle jobs enqueued before the template-based rendering was introduced
      await emailService.sendMailRaw(data.to, data.subject, data.html, appConfig.EMAIL_FROM)
      return
    }

    const {
      to,
      subject,
      publicName,
      callToActionLabel,
      callToActionUrl,
      contentBody,
      siteName,
      footer,
    } = data

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
