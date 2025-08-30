import { beforeEach, describe, expect, it, vi } from 'vitest'
import meetingRoutes from '../../api/routes/meetings.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  fastify.prisma.meeting = {
    create: vi.fn().mockResolvedValue({ id: '1', room: 'r', createdById: 'a', targetProfileId: 'b', createdAt: new Date() }),
    findFirst: vi.fn().mockResolvedValue({ id: '1', room: 'r', createdById: 'a', targetProfileId: 'b', createdAt: new Date() }),
    update: vi.fn().mockResolvedValue({ id: '1', room: 'r', createdById: 'a', targetProfileId: 'b', createdAt: new Date(), endedAt: new Date() }),
  }
  await meetingRoutes(fastify as any, {})
})

describe('meeting routes', () => {
  it('creates meeting', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: { profileId: 'a' }, body: { room: 'r', targetProfileId: 'ck00000000000000000000001' } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(fastify.prisma.meeting.create).toHaveBeenCalled()
  })

  it('fetches latest', async () => {
    const handler = fastify.routes['GET /latest']
    await handler({ session: { profileId: 'a' }, query: { withProfileId: 'ck00000000000000000000001' } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(fastify.prisma.meeting.findFirst).toHaveBeenCalled()
  })
})
