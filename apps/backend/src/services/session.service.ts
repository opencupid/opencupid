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
  /** Set of session IDs belonging to a user, so they can be revoked together. */
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
   * Merge partial data into an existing session without deleting it
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
