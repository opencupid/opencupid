// src/workers/emailWorker.ts
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '../lib/prisma'
import nodemailer from 'nodemailer'
import { appConfig } from '@shared/config/appconfig'

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
    if (job.name === 'sendLoginLinkEmail') {
      const { userId } = job.data as { userId: string }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')

      const otp = user.loginToken
      if (!otp || !user.email) throw new Error('OTP or email not found for user')

      await transporter.sendMail({
        from: appConfig.EMAIL_FROM,
        to: user.email,
        subject: 'Your login link',
        html: `<p>Hey there, welcome aboard!</p>
      <h1>${otp}</h1>
      <p>Please click this link to jump right in:       
      <a href="${appConfig.FRONTEND_URL}/auth/otp?otp=${otp}">Confirm Email</a></p>`,
      })
    }

    if (job.name === 'sendWelcomeEmail') {
      const { userId } = job.data as { userId: string }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found')
      if (!user.email) throw new Error('Email not found for user')

      await transporter.sendMail({
        from: appConfig.EMAIL_FROM,
        to: user.email,
        subject: 'Welcome to OpenCupid!',
        html: `<p>Hey there, welcome aboard!</p>
      <a href="${appConfig.FRONTEND_URL}/me">Go connect with people</a></p>
      `,
      })
    }
  },
  { connection }
)
