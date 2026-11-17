import type Redis from 'ioredis'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const REDIS_KEY_PREFIX = 'activity:last:'
const SESSION_GAP_SECONDS = 30 * 60

/**
 * Records profile activity. A `SET NX EX` claim on Redis is the dedup
 * primitive: only the first request inside each 30-minute window per profile
 * acquires the key, writes a `ProfileSessionLog` row and moves
 * `ProfileActivitySummary.lastSeenAt` forward. Every other request costs one
 * Redis round-trip and exits.
 *
 * lastSeenAt is written only here; the nightly distill reads it but never
 * writes it. A profile's first summary row starts in the `new` segment; the
 * distill recomputes the segment from there.
 *
 * P2003 (FK violation) is swallowed silently: a profile may be deleted while
 * its session cookie is still cached, in which case we'd otherwise log noise
 * for an insert that can never succeed.
 */
export async function recordActivity(redis: Redis, profileId: string): Promise<void> {
  const won = await redis.set(
    `${REDIS_KEY_PREFIX}${profileId}`,
    '1',
    'EX',
    SESSION_GAP_SECONDS,
    'NX'
  )
  if (!won) return

  const now = new Date()
  try {
    await prisma.$transaction([
      prisma.profileSessionLog.create({
        data: { profileId, startedAt: now },
      }),
      prisma.profileActivitySummary.upsert({
        where: { profileId },
        create: { profileId, firstSeenAt: now, lastSeenAt: now, segment: 'new' },
        update: { lastSeenAt: now },
      }),
    ])
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') return
    throw err
  }
}
