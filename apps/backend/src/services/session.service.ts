// src/services/session.service.ts
import Redis from 'ioredis'
import { UserRole } from '@prisma/client'
import { SessionData, SessionDataSchema } from '@zod/user/user.dto'

export class SessionService {
  constructor(
    private redis: Redis,
    private ttlSec = 60 * 60 * 24 * 7 // 7 days
  ) {}

  private sessionKey(id: string) {
    return `session:${id}`
  }
  private rolesKey(id: string) {
    return `session:${id}:roles`
  }

  /**
   * Fetch or create the session hash and roles set
   */
  async getOrCreate(id: string, data: SessionData): Promise<SessionData> {
    const hkey = this.sessionKey(id)

    await this.redis.multi().set(hkey, JSON.stringify(data)).expire(hkey, this.ttlSec).exec()

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
  async refreshTtl(id: string): Promise<void> {
    const hkey = this.sessionKey(id)
    const rkey = this.rolesKey(id)
    await this.redis.multi().expire(hkey, this.ttlSec).expire(rkey, this.ttlSec).exec()
  }

  /**
   * Delete a session and its roles
   */
  async delete(id: string): Promise<void> {
    const hkey = this.sessionKey(id)
    const rkey = this.rolesKey(id)
    await this.redis.multi().del(hkey).del(rkey).exec()
  }
}
