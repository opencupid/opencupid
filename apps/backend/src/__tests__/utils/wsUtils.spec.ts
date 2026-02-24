import { describe, it, expect, vi } from 'vitest'
import { broadcastToProfile, verifyWsTicket } from '../../utils/wsUtils'

describe('broadcastToProfile', () => {
  it('returns false when no connections exist', () => {
    const fastify = {
      connections: new Map(),
      log: { warn: vi.fn() },
    } as any

    const result = broadcastToProfile(fastify, 'profile1', { type: 'test' })
    expect(result).toBe(false)
    expect(fastify.log.warn).toHaveBeenCalled()
  })

  it('returns false when connections map is undefined', () => {
    const fastify = {
      connections: undefined,
      log: { warn: vi.fn() },
    } as any

    const result = broadcastToProfile(fastify, 'profile1', { type: 'test' })
    expect(result).toBe(false)
  })

  it('sends payload to all open sockets and returns true', () => {
    const socket1 = { readyState: 1, OPEN: 1, send: vi.fn() }
    const socket2 = { readyState: 1, OPEN: 1, send: vi.fn() }
    const sockets = new Set([socket1, socket2])

    const fastify = {
      connections: new Map([['profile1', sockets]]),
      log: { warn: vi.fn() },
    } as any

    const payload = { type: 'ws:test', data: 'hello' }
    const result = broadcastToProfile(fastify, 'profile1', payload)
    expect(result).toBe(true)
    expect(socket1.send).toHaveBeenCalledWith(JSON.stringify(payload))
    expect(socket2.send).toHaveBeenCalledWith(JSON.stringify(payload))
  })

  it('skips sockets that are not in OPEN state', () => {
    const openSocket = { readyState: 1, OPEN: 1, send: vi.fn() }
    const closedSocket = { readyState: 3, OPEN: 1, send: vi.fn() }
    const sockets = new Set([openSocket, closedSocket])

    const fastify = {
      connections: new Map([['profile1', sockets]]),
      log: { warn: vi.fn() },
    } as any

    broadcastToProfile(fastify, 'profile1', { type: 'test' })
    expect(openSocket.send).toHaveBeenCalled()
    expect(closedSocket.send).not.toHaveBeenCalled()
  })
})

describe('verifyWsTicket', () => {
  function createMockRedis(data: Record<string, string | null> = {}) {
    return {
      getdel: vi.fn((key: string) => Promise.resolve(data[key] ?? null)),
    } as any
  }

  it('throws on missing ticket query param', async () => {
    const req = { query: {} } as any
    const redis = createMockRedis()
    await expect(verifyWsTicket(req, redis)).rejects.toThrow('Missing or malformed ticket')
  })

  it('throws on invalid UUID ticket', async () => {
    const req = { query: { ticket: 'not-a-uuid' } } as any
    const redis = createMockRedis()
    await expect(verifyWsTicket(req, redis)).rejects.toThrow('Missing or malformed ticket')
  })

  it('throws when ticket not found in Redis', async () => {
    const ticket = '550e8400-e29b-41d4-a716-446655440000'
    const req = { query: { ticket } } as any
    const redis = createMockRedis()
    await expect(verifyWsTicket(req, redis)).rejects.toThrow('Invalid or expired ticket')
  })

  it('returns payload and deletes ticket on valid ticket', async () => {
    const ticket = '550e8400-e29b-41d4-a716-446655440000'
    const ticketData = { userId: 'user1', profileId: 'profile1' }
    const req = { query: { ticket } } as any
    const redis = createMockRedis({
      [`ws-ticket:${ticket}`]: JSON.stringify(ticketData),
    })

    const result = await verifyWsTicket(req, redis)
    expect(result).toEqual(ticketData)
    expect(redis.getdel).toHaveBeenCalledWith(`ws-ticket:${ticket}`)
  })

  it('throws when ticket payload is missing userId', async () => {
    const ticket = '550e8400-e29b-41d4-a716-446655440000'
    const req = { query: { ticket } } as any
    const redis = createMockRedis({
      [`ws-ticket:${ticket}`]: JSON.stringify({ profileId: 'profile1' }),
    })

    await expect(verifyWsTicket(req, redis)).rejects.toThrow('Invalid ticket payload')
  })
})
