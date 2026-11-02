import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionService } from '../../services/session.service'

function createMockRedis() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }
  return {
    get: vi.fn(),
    smembers: vi.fn(),
    multi: vi.fn(() => chain),
    _chain: chain,
  }
}

let redis: ReturnType<typeof createMockRedis>
let service: SessionService

beforeEach(() => {
  redis = createMockRedis()
  service = new SessionService(redis as any)
})

const sessionData = {
  lang: 'en',
  roles: ['user'],
  userId: 'cm000000000000000000user1',
  profileId: 'cm000000000000000000prof1',
  tokenVersion: 0,
  hasActiveProfile: true,
  profile: {
    id: 'cm000000000000000000prof1',
    isDatingActive: false,
    isSocialActive: true,
    isActive: true,
  },
}

describe('SessionService.getOrCreate', () => {
  it('stores session data in redis and returns it', async () => {
    const result = await service.getOrCreate('sess1', sessionData as any)
    expect(result).toEqual(sessionData)
    expect(redis.multi).toHaveBeenCalled()
    expect(redis._chain.set).toHaveBeenCalledWith('session:sess1', JSON.stringify(sessionData))
    expect(redis._chain.expire).toHaveBeenCalledWith('session:sess1', 2592000)
  })

  it("adds the session to the user's session set", async () => {
    await service.getOrCreate('sess1', sessionData as any)
    const ukey = `user:${sessionData.userId}:sessions`
    expect(redis._chain.sadd).toHaveBeenCalledWith(ukey, 'sess1')
    expect(redis._chain.expire).toHaveBeenCalledWith(ukey, 2592000)
  })
})

describe('SessionService.get', () => {
  it('returns parsed session data when found', async () => {
    redis.get.mockResolvedValue(JSON.stringify(sessionData))
    const result = await service.get('sess1')
    expect(redis.get).toHaveBeenCalledWith('session:sess1')
    expect(result).toEqual(sessionData)
  })

  it('returns null when session not found', async () => {
    redis.get.mockResolvedValue(null)
    const result = await service.get('missing')
    expect(result).toBeNull()
  })

  it('returns null on invalid session data', async () => {
    // Valid JSON but doesn't match SessionDataSchema
    redis.get.mockResolvedValue(JSON.stringify({ bad: 'data' }))
    const result = await service.get('bad')
    expect(result).toBeNull()
  })
})

describe('SessionService.refreshTtl', () => {
  it("refreshes TTL on session, roles and the user's session set", async () => {
    await service.refreshTtl('sess1', 'user1')
    expect(redis.multi).toHaveBeenCalled()
    expect(redis._chain.expire).toHaveBeenCalledWith('session:sess1', 2592000)
    expect(redis._chain.expire).toHaveBeenCalledWith('session:sess1:roles', 2592000)
    expect(redis._chain.expire).toHaveBeenCalledWith('user:user1:sessions', 2592000)
  })
})

describe('SessionService.patch', () => {
  it('merges partial data into existing session', async () => {
    redis.get.mockResolvedValue(JSON.stringify(sessionData))
    await service.patch('sess1', { lang: 'hu' })

    // Zod reorders keys when parsing, so compare as parsed objects
    const storedJson = redis._chain.set.mock.calls[0][1]
    expect(JSON.parse(storedJson)).toEqual({ ...sessionData, lang: 'hu' })
    expect(redis._chain.expire).toHaveBeenCalledWith('session:sess1', 2592000)
    expect(redis._chain.expire).toHaveBeenCalledWith(`user:${sessionData.userId}:sessions`, 2592000)
  })

  it('does nothing when session does not exist', async () => {
    redis.get.mockResolvedValue(null)
    await service.patch('missing', { lang: 'hu' })

    expect(redis.multi).not.toHaveBeenCalled()
  })
})

describe('SessionService.delete', () => {
  it("deletes session and roles keys and removes it from the user's set", async () => {
    await service.delete('sess1', 'user1')
    expect(redis.multi).toHaveBeenCalled()
    expect(redis._chain.del).toHaveBeenCalledWith('session:sess1')
    expect(redis._chain.del).toHaveBeenCalledWith('session:sess1:roles')
    expect(redis._chain.srem).toHaveBeenCalledWith('user:user1:sessions', 'sess1')
  })
})

describe('SessionService.deleteAllForUser', () => {
  it("deletes every session in the user's set and the set itself", async () => {
    redis.smembers.mockResolvedValue(['s1', 's2'])
    await service.deleteAllForUser('user1')
    expect(redis.smembers).toHaveBeenCalledWith('user:user1:sessions')
    for (const key of ['session:s1', 'session:s1:roles', 'session:s2', 'session:s2:roles']) {
      expect(redis._chain.del).toHaveBeenCalledWith(key)
    }
    expect(redis._chain.del).toHaveBeenCalledWith('user:user1:sessions')
    expect(redis._chain.exec).toHaveBeenCalled()
  })

  it('only deletes the set when the user has no sessions', async () => {
    redis.smembers.mockResolvedValue([])
    await service.deleteAllForUser('user1')
    expect(redis._chain.del).toHaveBeenCalledTimes(1)
    expect(redis._chain.del).toHaveBeenCalledWith('user:user1:sessions')
  })
})
