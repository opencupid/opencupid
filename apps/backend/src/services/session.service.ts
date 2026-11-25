// src/services/session.service.ts
import Redis from 'ioredis'
import { UserRole } from '@prisma/client'
import { SessionData, SessionDataSchema } from '@zod/user/user.dto'

export class SessionService {
  constructor(
    private redis: Redis,
    private ttlSec = 60 * 60 * 24 * 30 // 30 days
  ) {}

  private sessionKey(id: string) {
    return `session:${id}`
  }
  private rolesKey(id: string) {
    return `session:${id}:roles`
  }
  /**
   * Set of session IDs belonging to a user, so they can be revoked together.
   *
   * Invariants and edge cases:
   * - Only getOrCreate(), replace() (and scripts/backfill-user-sessions.ts) add
   *   members.
   *   patch() and refreshTtl() only extend the set's TTL, so a session that is
   *   missing from the set stays missing — e.g. one created before this index
   *   existed and not yet backfilled. Such a session can't be revoked by
   *   deleteAllForUser().
   * - Members are never pruned when a session key expires on its own. Stale IDs
   *   are harmless: deleting a missing key is a no-op, and the set expires
   *   ttlSec after the user's last session activity.
   * - The set's TTL is refreshed together with any session's TTL, so it always
   *   outlives every live member.
   */
  private userSessionsKey(userId: string) {
    return `user:${userId}:sessions`
  }

  /**
   * Fetch or create the session hash and roles set
   */
  async getOrCreate(id: string, data: SessionData): Promise<SessionData> {
    const hkey = this.sessionKey(id)

    const ukey = this.userSessionsKey(data.userId)

    await this.redis
      .multi()
      .set(hkey, JSON.stringify(data))
      .expire(hkey, this.ttlSec)
      .sadd(ukey, id)
      .expire(ukey, this.ttlSec)
      .exec()

    return data
  }

  /**
   * Get session data; returns null if none exists
   */
  async get(id: string): Promise<SessionData | null> {
    const hkey = this.sessionKey(id)
    const raw = await this.redis.get(hkey)
    if (!raw) return null

    const result = SessionDataSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  }

  /**
   * Refresh TTL on session data
   */
  async refreshTtl(id: string, userId: string): Promise<void> {
    const hkey = this.sessionKey(id)
    const rkey = this.rolesKey(id)
    const ukey = this.userSessionsKey(userId)
    await this.redis
      .multi()
      .expire(hkey, this.ttlSec)
      .expire(rkey, this.ttlSec)
      .expire(ukey, this.ttlSec)
      .exec()
  }

  /**
   * Merge partial data into an existing session without deleting it. A session
   * deleted between the read and the write (logout, refresh, deleteAllForUser)
   * stays deleted.
   */
  async patch(id: string, data: Partial<SessionData>): Promise<void> {
    const existing = await this.get(id)
    if (!existing) return
    const merged = { ...existing, ...data }
    const hkey = this.sessionKey(id)
    const ukey = this.userSessionsKey(existing.userId)
    await this.redis
      .multi()
      .set(hkey, JSON.stringify(merged), 'XX')
      .expire(hkey, this.ttlSec)
      .expire(ukey, this.ttlSec)
      .exec()
  }

  /**
   * Continue a session under a new ID, keeping the old one. Returns false, and
   * creates nothing, if the old session no longer exists: a request that
   * authenticated before its session was revoked must not bring it back.
   *
   * Atomic with deleteAllForUser(): the new session is either created before
   * it, and deleted with the others, or not created. (A dead ID left in the set
   * is harmless, see userSessionsKey.)
   */
  async replace(id: string, newId: string, userId: string): Promise<boolean> {
    const newKey = this.sessionKey(newId)
    const ukey = this.userSessionsKey(userId)
    const results = await this.redis
      .multi()
      .copy(this.sessionKey(id), newKey, 'REPLACE')
      .expire(newKey, this.ttlSec)
      .sadd(ukey, newId)
      .expire(ukey, this.ttlSec)
      .exec()
    const [err, copied] = results?.[0] ?? []
    if (err) throw err
    return copied === 1
  }

  /**
   * Delete a session and its roles
   */
  async delete(id: string, userId: string): Promise<void> {
    const hkey = this.sessionKey(id)
    const rkey = this.rolesKey(id)
    const ukey = this.userSessionsKey(userId)
    await this.redis.multi().del(hkey).del(rkey).srem(ukey, id).exec()
  }

  /**
   * Delete every session belonging to a user (e.g. when they are blocked).
   *
   * Runs as one script, so no session can be added between reading the set and
   * deleting its members.
   *
   * Edge case — not a hard guarantee that no session survives: a /auth/refresh
   * that already passed its tokenVersion check can create its replacement
   * session after this returns. Callers revoking access should bump
   * User.tokenVersion first so refreshes that start afterwards fail; only one
   * already in flight can slip through.
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.redis.eval(
      `for _, id in ipairs(redis.call('SMEMBERS', KEYS[1])) do
         local key = ARGV[1] .. id
         redis.call('DEL', key, key .. ':roles')
       end
       redis.call('DEL', KEYS[1])`,
      1,
      this.userSessionsKey(userId),
      this.sessionKey('')
    )
  }
}
