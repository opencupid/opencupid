import { describe, it, expect, vi } from 'vitest'
import { broadcastToProfile, verifyWsToken } from '../../utils/wsUtils'

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

describe('verifyWsToken', () => {
  it('throws on missing token query param', () => {
    const req = { query: {} } as any
    const jwt = { verify: vi.fn() }
    expect(() => verifyWsToken(req, jwt)).toThrow('Missing or malformed token')
  })

  it('throws on empty token', () => {
    const req = { query: { token: '' } } as any
    const jwt = { verify: vi.fn() }
    expect(() => verifyWsToken(req, jwt)).toThrow('Missing or malformed token')
  })

  it('throws when jwt payload has no userId', () => {
    const req = { query: { token: 'valid-token' } } as any
    const jwt = { verify: vi.fn().mockReturnValue({}) }
    expect(() => verifyWsToken(req, jwt)).toThrow('Invalid token payload')
  })

  it('returns payload on valid token', () => {
    const payload = { userId: 'user1' }
    const req = { query: { token: 'valid-token' } } as any
    const jwt = { verify: vi.fn().mockReturnValue(payload) }
    const result = verifyWsToken(req, jwt)
    expect(result).toEqual(payload)
    expect(jwt.verify).toHaveBeenCalledWith('valid-token')
  })
})
