import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'

// Shared ioredis connection for every BullMQ Queue and Worker instance in the
// process. `maxRetriesPerRequest: null` is required by BullMQ Workers, and Queues
// tolerate it fine. BullMQ internally `.duplicate()`s this connection when it
// needs blocking commands, so one exported instance is safe to share.
export const bullConnection = new IORedis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
})
