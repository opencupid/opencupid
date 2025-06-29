import { describe, it, expect, beforeEach, vi } from 'vitest'
import pushRoutes from '../../api/routes/push.routes'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let upsert: any

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  upsert = vi.fn()
  fastify.prisma = { pushSubscription: { upsert } } as any
  await pushRoutes(fastify as any, {})
})

describe('POST /subscription', () => {
  it('stores subscription and returns result', async () => {
    const handler = fastify.routes['POST /subscription']
    upsert.mockResolvedValue({ id: 'sub1' })
    await handler({
      body: { endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } },
      headers: { 'user-agent': 'UA' },
      user: { userId: 'u1' }
    } as any, reply as any)
    expect(upsert).toHaveBeenCalledWith({
      where: { endpoint: 'e' },
      update: { endpoint: 'e', p256dh: 'p', auth: 'a', userId: 'u1', lastSeen: expect.any(Date) },
      create: { endpoint: 'e', p256dh: 'p', auth: 'a', userId: 'u1', deviceInfo: 'UA' }
    })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.updated.id).toBe('sub1')
  })
})
