import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'
import { ClusterService } from '@/services/cluster.service'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

new Worker(
  'cluster-index',
  async (job) => {
    const { profileId } = job.data as { profileId: string }
    await ClusterService.getInstance().buildIndex(profileId)
  },
  { connection }
)
