import Redis from 'ioredis'
import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'

const REDIS_KEY_PREFIX = 'activity:last:'
const REDIS_TTL_SECONDS = 24 * 60 * 60 // 24h

/**
 * Records profile activity by managing session logs.
 * Called on each authenticated request; uses a Redis key to debounce
 * so that a new Postgres row is only written once per session gap window.
 */
export async function recordActivity(redis: Redis, profileId: string): Promise<void> {
  const key = `${REDIS_KEY_PREFIX}${profileId}`
  const last = await redis.get(key)
  const now = new Date()
  const gapMs = appConfig.ACTIVITY_SESSION_GAP_MINUTES * 60 * 1000

  if (last) {
    const elapsed = now.getTime() - Number(last)
    if (elapsed < gapMs) {
      return // still within the current session window
    }
  }

  // Close the most recent open session for this profile
  await prisma.profileSessionLog.updateMany({
    where: { profileId, endedAt: null },
    data: { endedAt: now },
  })

  // Start a new session
  await prisma.profileSessionLog.create({
    data: { profileId, startedAt: now },
  })

  // Store the timestamp in Redis so subsequent requests within the gap are skipped
  await redis.set(key, String(now.getTime()), 'EX', REDIS_TTL_SECONDS)
}
