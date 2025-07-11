import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import nodemailer from 'nodemailer'
import { appConfig } from '@/lib/appconfig'

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

const transporter = nodemailer.createTransport({
  host: appConfig.SMTP_HOST,
  port: Number(appConfig.SMTP_PORT),
  secure: false,
  auth: {
    user: appConfig.SMTP_USER,
    pass: appConfig.SMTP_PASS,
  },
})

new Worker(
  'emails',
  async job => {
    const { to, subject, html } = job.data as {
      to: string
      subject: string
      html: string
    }

    await transporter.sendMail({
      from: appConfig.EMAIL_FROM,
      to,
      subject,
      html,
    })
  },
  { connection }
)
