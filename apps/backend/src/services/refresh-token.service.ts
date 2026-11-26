import { randomUUID } from 'crypto'
import Redis from 'ioredis'

interface RefreshTokenData {
  userId: string
  profileId: string
  tokenVersion: number
}

export class RefreshTokenService {
  private ttlSec = 60 * 60 * 24 * 90 // 90 days

  /**
   * How long a rotated-out refresh token stays usable. Tabs share the cookie
   * jar, so two tabs that hit a 401 together both send the same refresh
   * token; if the first refresh deleted it outright, the second would fail
   * and that tab would log out — clearing the session cookie the first tab
   * just received.
   */
  private reuseGraceSec = 60

  constructor(private redis: Redis) {}

  private key(userId: string, token: string) {
    return `refresh:${userId}:${token}`
  }

  async create(userId: string, profileId: string, tokenVersion: number): Promise<string> {
    const token = randomUUID()
    const data: RefreshTokenData = { userId, profileId, tokenVersion }
    const key = this.key(userId, token)
    await this.redis.set(key, JSON.stringify(data), 'EX', this.ttlSec)
    return token
  }

  async validate(token: string, userId: string): Promise<RefreshTokenData | null> {
    const key = this.key(userId, token)
    const raw = await this.redis.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as RefreshTokenData
    } catch {
      return null
    }
  }

  async delete(token: string, userId: string): Promise<void> {
    const key = this.key(userId, token)
    await this.redis.del(key)
  }

  /**
   * Rotate a token out: it keeps working for the grace period, then expires.
   * LT only ever shortens the TTL, so reusing a retired token within the grace
   * period doesn't extend it.
   */
  async retire(token: string, userId: string): Promise<void> {
    await this.redis.expire(this.key(userId, token), this.reuseGraceSec, 'LT')
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const pattern = `refresh:${userId}:*`
    let cursor = '0'
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } while (cursor !== '0')
  }
}
