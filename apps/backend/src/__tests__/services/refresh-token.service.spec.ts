import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RefreshTokenService } from '../../services/refresh-token.service'

function createMockRedis() {
  const store: Record<string, string> = {}
  return {
    set: vi.fn(async (key: string, value: string) => {
      store[key] = value
    }),
    get: vi.fn(async (key: string) => store[key] ?? null),
    del: vi.fn(async (...keys: string[]) => {
      keys.forEach((k) => delete store[k])
      return keys.length
    }),
    scan: vi.fn(async () => ['0', []]),
    _store: store,
  }
}

let redis: ReturnType<typeof createMockRedis>
let service: RefreshTokenService

beforeEach(() => {
  redis = createMockRedis()
  service = new RefreshTokenService(redis as any)
})

describe('RefreshTokenService.create', () => {
  it('creates a refresh token and stores in Redis', async () => {
    const token = await service.create('user1', 'profile1', 0)
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(redis.set).toHaveBeenCalledWith(
      `refresh:user1:${token}`,
      JSON.stringify({ userId: 'user1', profileId: 'profile1', tokenVersion: 0 }),
      'EX',
      60 * 60 * 24 * 90
    )
  })
})

describe('RefreshTokenService.validate', () => {
  it('returns data for valid token', async () => {
    const data = { userId: 'user1', profileId: 'profile1', tokenVersion: 0 }
    redis._store['refresh:user1:tok1'] = JSON.stringify(data)
    const result = await service.validate('tok1', 'user1')
    expect(result).toEqual(data)
  })

  it('returns null for missing token', async () => {
    const result = await service.validate('nonexistent', 'user1')
    expect(result).toBeNull()
  })

  it('returns null for invalid JSON', async () => {
    redis._store['refresh:user1:bad'] = 'not-json'
    const result = await service.validate('bad', 'user1')
    expect(result).toBeNull()
  })
})

describe('RefreshTokenService.delete', () => {
  it('deletes a specific token', async () => {
    redis._store['refresh:user1:tok1'] = 'data'
    await service.delete('tok1', 'user1')
    expect(redis.del).toHaveBeenCalledWith('refresh:user1:tok1')
  })
})

describe('RefreshTokenService.deleteAllForUser', () => {
  it('scans and deletes all tokens for user', async () => {
    const keys = ['refresh:user1:tok1', 'refresh:user1:tok2']
    redis.scan.mockResolvedValueOnce(['0', keys])
    await service.deleteAllForUser('user1')
    expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'refresh:user1:*', 'COUNT', 100)
    expect(redis.del).toHaveBeenCalledWith(...keys)
  })

  it('handles no tokens found', async () => {
    redis.scan.mockResolvedValueOnce(['0', []])
    await service.deleteAllForUser('user1')
    expect(redis.del).not.toHaveBeenCalled()
  })
})
