import { beforeEach, describe, expect, it, vi } from 'vitest'
import postRoutes from '../../api/routes/post.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockPostService: any

vi.mock('../../services/post.service', () => ({
  PostService: { getInstance: () => mockPostService },
}))

vi.mock('../../api/mappers/post.mappers', () => ({
  mapDbPostToOwner: (post: any) => post,
  mapDbPostToPublic: (post: any) => post,
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockPostService = {
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findNearby: vi.fn(),
    findRecent: vi.fn(),
    findByProfileId: vi.fn(),
  }
  await postRoutes(fastify as any, {})
})

describe('PATCH /:id', () => {
  it('updates visibility (hide post)', async () => {
    const id = 'cmc7t45x400086w39gj30pzn3'
    const profileId = 'cmc7t45x400086w39gj30pzn4'
    mockPostService.update.mockResolvedValue({
      id,
      postedById: profileId,
      isVisible: false,
    })

    const handler = fastify.routes['PATCH /:id']
    await handler(
      {
        params: { id },
        body: { isVisible: false },
        session: { profileId },
      } as any,
      reply as any
    )

    expect(mockPostService.update).toHaveBeenCalledWith(id, profileId, { isVisible: false })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.post.isVisible).toBe(false)
  })

  it('returns 401 when profile is missing', async () => {
    const handler = fastify.routes['PATCH /:id']
    await handler(
      {
        params: { id: 'cmc7t45x400086w39gj30pzn3' },
        body: { isVisible: false },
        session: {},
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(401)
    expect(reply.payload.success).toBe(false)
  })
})

describe('DELETE /:id', () => {
  it('deletes own post', async () => {
    const id = 'cmc7t45x400086w39gj30pzn3'
    const profileId = 'cmc7t45x400086w39gj30pzn4'
    mockPostService.delete.mockResolvedValue({ id, isDeleted: true })

    const handler = fastify.routes['DELETE /:id']
    await handler(
      {
        params: { id },
        session: { profileId },
      } as any,
      reply as any
    )

    expect(mockPostService.delete).toHaveBeenCalledWith(id, profileId)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
  })

  it('returns 404 when post is not found or access denied', async () => {
    mockPostService.delete.mockResolvedValue(null)

    const handler = fastify.routes['DELETE /:id']
    await handler(
      {
        params: { id: 'cmc7t45x400086w39gj30pzn3' },
        session: { profileId: 'cmc7t45x400086w39gj30pzn4' },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(404)
    expect(reply.payload.success).toBe(false)
  })

  it('returns 401 when profile is missing', async () => {
    const handler = fastify.routes['DELETE /:id']
    await handler(
      {
        params: { id: 'cmc7t45x400086w39gj30pzn3' },
        session: {},
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(401)
    expect(reply.payload.success).toBe(false)
  })
})
