import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'

export const emailQueue = new Queue('emails', { connection: bullConnection })
