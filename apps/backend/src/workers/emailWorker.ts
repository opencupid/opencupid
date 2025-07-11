// src/workers/emailWorker.ts
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '../lib/prisma'
import nodemailer from 'nodemailer'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'

const redisUrl = appConfig.REDIS_URL
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not defined')
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
})

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
    const siteName = appConfig.SITE_NAME || 'OpenCupid'

    if (job.name === 'sendLoginLinkEmail') {
      const { userId } = job.data as { userId: string }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')

      const otp = user.loginToken
      if (!otp || !user.email) throw new Error('OTP or email not found for user')

      const t = i18next.getFixedT(user.language || 'en')
      const link = `${appConfig.FRONTEND_URL}/auth/otp?otp=${otp}`
      await transporter.sendMail({
        from: appConfig.EMAIL_FROM,
        to: user.email,
        subject: t('emails.loginLink.subject', { siteName }),
        html: t('emails.loginLink.html', { otp, link, siteName }),
      })
    }

    if (job.name === 'sendWelcomeEmail') {
      const { userId } = job.data as { userId: string }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')
      if (!user.email) throw new Error('Email not found for user')

      const t = i18next.getFixedT(user.language || 'en')
      const link = `${appConfig.FRONTEND_URL}/me`
      await transporter.sendMail({
        from: appConfig.EMAIL_FROM,
        to: user.email,
        subject: t('emails.welcome.subject', { siteName }),
        html: t('emails.welcome.html', { link, siteName }),
      })
    }
  },
  { connection }
)
