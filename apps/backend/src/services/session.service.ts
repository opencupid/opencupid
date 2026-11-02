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
   * - Only getOrCreate() (and scripts/backfill-user-sessions.ts) add members.
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
   * Merge partial data into an existing session without deleting it.
   *
   * Edge case — not atomic: this is a GET followed by a separate SET. If the
   * session is deleted in between (logout, refresh, deleteAllForUser), the SET
   * recreates the session key without re-adding it to the user's set, leaving
   * a live session that deleteAllForUser() can no longer find. A write with
   * `SET … XX` (only if the key still exists) would close this window.
   * A patch that starts after the delete is safe: get() returns null.
   */
  async patch(id: string, data: Partial<SessionData>): Promise<void> {
    const existing = await this.get(id)
    if (!existing) return
    const merged = { ...existing, ...data }
    const hkey = this.sessionKey(id)
    const ukey = this.userSessionsKey(existing.userId)
    await this.redis
      .multi()
      .set(hkey, JSON.stringify(merged))
      .expire(hkey, this.ttlSec)
      .expire(ukey, this.ttlSec)
      .exec()
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
   * Edge cases — not a hard guarantee that no session survives:
   * - A session created between SMEMBERS and EXEC isn't deleted. It stays in
   *   the set (only the IDs read are SREM'd), so a later call can revoke it.
   * - A /auth/refresh that already passed its tokenVersion check can create
   *   its replacement session after this returns. Callers revoking access
   *   should bump User.tokenVersion first so refreshes that start afterwards
   *   fail; only one already in flight can slip through.
   * - A concurrent patch() can recreate a deleted session (see patch()).
   */
  async deleteAllForUser(userId: string): Promise<void> {
    const ukey = this.userSessionsKey(userId)
    const ids = await this.redis.smembers(ukey)
    if (ids.length === 0) return
    const tx = this.redis.multi()
    for (const id of ids) {
      tx.del(this.sessionKey(id)).del(this.rolesKey(id))
    }
    // Remove only the IDs read above: a session created after SMEMBERS stays
    // indexed (and revocable) instead of being dropped with the whole set.
    await tx.srem(ukey, ...ids).exec()
  }
}
