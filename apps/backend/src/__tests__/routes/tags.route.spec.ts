import { describe, it, expect, beforeEach, vi } from 'vitest'
import tagsRoutes from '../../api/routes/tags.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockTagService: any

vi.mock('../../services/tag.service', () => ({
  TagService: { getInstance: () => mockTagService },
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockTagService = {
    search: vi.fn(),
    create: vi.fn(),
    getPopularTags: vi.fn(),
    findManyByIds: vi.fn(),
  }
  await tagsRoutes(fastify as any, {})
})

describe('GET /popular', () => {
  it('returns popular tags', async () => {
    const handler = fastify.routes['GET /popular']
    mockTagService.getPopularTags.mockResolvedValue([
      { id: 't1', name: 'Hiking', slug: 'hiking', count: 5 },
      { id: 't2', name: 'Music', slug: 'music', count: 3 },
    ])
    await handler(
      { query: {}, user: { userId: 'u1' }, session: { lang: 'en' } } as any,
      reply as any
    )
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags).toHaveLength(2)
    expect(reply.payload.tags[0].count).toBe(5)
  })

  it('passes query params to service', async () => {
    const handler = fastify.routes['GET /popular']
    mockTagService.getPopularTags.mockResolvedValue([
      { id: 't1', name: 'Hiking', slug: 'hiking', count: 5 },
    ])
    await handler(
      {
        query: { limit: '10', country: 'DE' },
        user: { userId: 'u1' },
        session: { lang: 'de' },
      } as any,
      reply as any
    )
    expect(mockTagService.getPopularTags).toHaveBeenCalledWith({
      limit: 10,
      country: 'DE',
      locale: 'de',
    })
    expect(mockTagService.getPopularTags).toHaveBeenCalledTimes(1)
  })

  it('falls back to no country when country-filtered results are empty', async () => {
    const handler = fastify.routes['GET /popular']
    mockTagService.getPopularTags
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 't2', name: 'Music', slug: 'music', count: 3 }])
    await handler(
      {
        query: { limit: '10', country: 'DE' },
        user: { userId: 'u1' },
        session: { lang: 'de' },
      } as any,
      reply as any
    )
    expect(mockTagService.getPopularTags).toHaveBeenNthCalledWith(1, {
      limit: 10,
      country: 'DE',
      locale: 'de',
    })
    expect(mockTagService.getPopularTags).toHaveBeenNthCalledWith(2, {
      limit: 10,
      country: undefined,
      locale: 'de',
    })
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags).toEqual([{ id: 't2', name: 'Music', slug: 'music', count: 3 }])
  })
})

describe('GET /search', () => {
  it('returns mapped tags', async () => {
    const handler = fastify.routes['GET /search']
    mockTagService.search.mockResolvedValue([
      {
        id: 'ck1234567890abcd12345678',
        name: 'Test',
        slug: 'test',
        translations: [{ name: 'Test', locale: 'en' }],
      },
    ])
    await handler(
      { query: { q: 'te' }, user: { userId: 'u1' }, session: { lang: 'en' } } as any,
      reply as any
    )
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags[0].name).toBe('Test')
  })
})

describe('POST /tags', () => {
  it('creates tag', async () => {
    const handler = fastify.routes['POST /']
    mockTagService.create.mockResolvedValue({
      id: 'ck1234567890abcd12345679',
      name: 'Foo',
      slug: 'foo',
      translations: [{ name: 'Test' }],
    })
    await handler(
      { user: { userId: 'u1' }, session: { lang: 'en' }, body: { name: 'Foo' } } as any,
      reply as any
    )
    expect(reply.payload.success).toBe(true)
    expect(mockTagService.create).toHaveBeenCalledWith('en', {
      name: 'Foo',
      createdBy: 'u1',
      isUserCreated: true,
      originalLocale: 'en',
    } as any)
  })
})

describe('GET /by-ids', () => {
  const handler = () => fastify.routes['GET /by-ids']!
  const req = (query: Record<string, string>) =>
    ({ query, user: { userId: 'u1' }, session: { lang: 'hu' } }) as any
  const dbTag = (id: string, en: string, hu: string) => ({
    id,
    name: en,
    slug: en.toLowerCase(),
    translations: [
      { locale: 'en', name: en },
      { locale: 'hu', name: hu },
    ],
  })

  it('returns the tags for the ids, translated to the session locale', async () => {
    mockTagService.findManyByIds.mockResolvedValue([
      dbTag('cktag00000000000000000001', 'Hiking', 'Túrázás'),
    ])

    await handler()(req({ ids: 'cktag00000000000000000001,cktag00000000000000000001' }), reply)

    expect(mockTagService.findManyByIds).toHaveBeenCalledWith(['cktag00000000000000000001'])
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.tags).toEqual([
      expect.objectContaining({ id: 'cktag00000000000000000001', name: 'Túrázás' }),
    ])
  })

  it('returns 400 for malformed ids', async () => {
    await handler()(req({ ids: 'not-a-cuid' }), reply)

    expect(reply.statusCode).toBe(400)
    expect(mockTagService.findManyByIds).not.toHaveBeenCalled()
  })

  it('returns 400 for more ids than the browse tag limit', async () => {
    const ids = Array.from({ length: 6 }, (_, i) => `cktag0000000000000000000${i}`).join(',')
    await handler()(req({ ids }), reply)

    expect(reply.statusCode).toBe(400)
  })

  it('returns 500 when the lookup fails', async () => {
    mockTagService.findManyByIds.mockRejectedValue(new Error('db'))

    await handler()(req({ ids: 'cktag00000000000000000001' }), reply)

    expect(reply.statusCode).toBe(500)
  })
})
