import { appConfig } from '@/lib/appconfig'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = appConfig.REDIS_URL

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
})

export const emailQueue = new Queue('emails', { connection })
