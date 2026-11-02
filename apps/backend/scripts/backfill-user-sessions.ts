/**
 * One-off backfill: index pre-existing `session:<id>` keys into the per-user
 * `user:<userId>:sessions` sets that SessionService now maintains, so that
 * sessions created before the deploy can be revoked by deleteAllForUser().
 *
 * Idempotent — safe to re-run.
 *
 * Edge cases:
 * - Run it after the deploy. Sessions created after the deploy are already
 *   indexed by SessionService; this only needs to catch older ones.
 * - Keys whose data no longer matches SessionDataSchema, or that have no TTL,
 *   are skipped (counted as "skipped"). They aren't indexed and so can't be
 *   revoked by deleteAllForUser(). session-auth rejects unparseable sessions
 *   anyway.
 * - `session:<id>:roles` keys are skipped; deleteAllForUser() deletes them
 *   alongside their session.
 *
 *   pnpm --filter backend sessions:backfill                       # dev
 *   docker compose exec backend node dist/scripts/backfill-user-sessions.js   # prod
 */
import Redis from 'ioredis'
import { SessionDataSchema } from '@zod/user/user.dto'
import { appConfig } from '@/lib/appconfig'

async function main() {
  const redis = new Redis(appConfig.REDIS_URL)

  let indexed = 0
  let skipped = 0
  let cursor = '0'
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'session:*', 'COUNT', 500)
    cursor = next
    for (const key of keys) {
      if (key.endsWith(':roles')) continue
      const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)])
      const parsed = raw ? SessionDataSchema.safeParse(JSON.parse(raw)) : null
      if (!parsed?.success || ttl <= 0) {
        skipped++
        continue
      }
      const ukey = `user:${parsed.data.userId}:sessions`
      // NX sets a TTL on a fresh set; GT only ever extends an existing one, so
      // a concurrent login that already extended the set is never shortened.
      await redis
        .multi()
        .sadd(ukey, key.slice('session:'.length))
        .expire(ukey, ttl, 'NX')
        .expire(ukey, ttl, 'GT')
        .exec()
      indexed++
    }
  } while (cursor !== '0')

  console.log(`Indexed ${indexed} sessions, skipped ${skipped}`)
  await redis.quit()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
