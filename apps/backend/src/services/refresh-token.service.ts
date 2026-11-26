import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { REFRESH_MAX_AGE } from '@shared/session'

interface RefreshTokenData {
  userId: string
  profileId: string
  tokenVersion: number
}

export class RefreshTokenService {
  constructor(private redis: Redis) {}

  private key(userId: string, token: string) {
    return `refresh:${userId}:${token}`
  }

  async create(userId: string, profileId: string, tokenVersion: number): Promise<string> {
    const token = randomUUID()
    const data: RefreshTokenData = { userId, profileId, tokenVersion }
    const key = this.key(userId, token)
    await this.redis.set(key, JSON.stringify(data), 'EX', REFRESH_MAX_AGE)
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
