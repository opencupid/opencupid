import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @bull-board packages before importing the plugin
vi.mock('@bull-board/api', () => ({
  createBullBoard: vi.fn(),
}))
vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: vi.fn(),
}))
vi.mock('@bull-board/fastify', () => ({
  FastifyAdapter: class {
    setBasePath = vi.fn()
    registerPlugin = vi.fn(() => vi.fn())
  },
}))
vi.mock('../../queues/emailQueue', () => ({ emailQueue: {} }))
vi.mock('../../queues/activityQueue', () => ({ activityQueue: {} }))

import bullBoardPlugin from '../../plugins/bull-board'

class MockFastify {
  public routes: Record<string, any> = {}
  public hooks: Record<string, any[]> = {}

  get(path: string, handler: any) {
    this.routes[`GET ${path}`] = handler
  }
  addHook(name: string, fn: any) {
    if (!this.hooks[name]) this.hooks[name] = []
    this.hooks[name].push(fn)
  }
  register() {}
}

class MockReply {
  statusCode = 200
  payload: any
  redirectUrl: string | undefined

  code(status: number) {
    this.statusCode = status
    return this
  }
  send(payload: any) {
    this.payload = payload
    return this
  }
  redirect(url: string) {
    this.redirectUrl = url
    return this
  }
}

let fastify: MockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  await bullBoardPlugin(fastify as any, {})
})

describe('bull-board auth guard', () => {
  it('returns 403 when X-Admin-Authenticated header is missing', async () => {
    const hook = fastify.hooks['onRequest'][0]
    const req = { headers: {} }
    await hook(req, reply)
    expect(reply.statusCode).toBe(403)
    expect(reply.payload).toEqual({ success: false, message: 'Forbidden' })
  })

  it('returns 403 when X-Admin-Authenticated header is not "true"', async () => {
    const hook = fastify.hooks['onRequest'][0]
    const req = { headers: { 'x-admin-authenticated': 'false' } }
    await hook(req, reply)
    expect(reply.statusCode).toBe(403)
    expect(reply.payload).toEqual({ success: false, message: 'Forbidden' })
  })

  it('does not block when X-Admin-Authenticated is "true"', async () => {
    const hook = fastify.hooks['onRequest'][0]
    const req = { headers: { 'x-admin-authenticated': 'true' } }
    await hook(req, reply)
    expect(reply.statusCode).toBe(200) // reply untouched
    expect(reply.payload).toBeUndefined()
  })
})

describe('GET / redirect', () => {
  it('redirects to /bull-board/', async () => {
    const handler = fastify.routes['GET /']
    await handler({}, reply)
    expect(reply.redirectUrl).toBe('/bull-board/')
  })
})
