import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockFastify, MockReply } from '../../test-utils/fastify'

import browseRoutes from '../../api/routes/browse.route'

let fastify: MockFastify
let reply: MockReply

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
}

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  vi.clearAllMocks()
  await browseRoutes(fastify as any, {})
})

// ────────────────────────────────────────────────────────────────────
// Deprecated shim — /browse/bounds replaced by /find/social/map/clusters
// ────────────────────────────────────────────────────────────────────
describe('GET /bounds (deprecated shim)', () => {
  it('returns a static empty response', async () => {
    const handler = fastify.routes['GET /bounds']
    await handler({ session: mockSession } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({
      success: true,
      profiles: [],
      posts: [],
      tags: [],
    })
  })
})
