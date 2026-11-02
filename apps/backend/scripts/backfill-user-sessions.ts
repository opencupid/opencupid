/**
 * One-off backfill: index pre-existing `session:<id>` keys into the per-user
 * `user:<userId>:sessions` sets that SessionService now maintains, so that
 * sessions created before the deploy can be revoked by deleteAllForUser().
 *
 * Idempotent — safe to re-run.
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
      const setTtl = await redis.ttl(ukey)
      const tx = redis.multi().sadd(ukey, key.slice('session:'.length))
      if (ttl > setTtl) tx.expire(ukey, ttl)
      await tx.exec()
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
