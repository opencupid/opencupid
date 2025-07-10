import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('@shared/config/appconfig', () => ({ appConfig: { TYPEAHEAD_DEBOUNCE_MS: 300 } }))
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
  mockTagService = { search: vi.fn(), create: vi.fn() }
  await tagsRoutes(fastify as any, {  })
})

describe('GET /search', () => {
  it('returns mapped tags', async () => {
    const handler = fastify.routes['GET /search']
    mockTagService.search.mockResolvedValue([{ id: 'ck1234567890abcd12345678', name: 'Test', slug: 'test' , translations: [{ name: 'Test', locale: 'en' }] }])
    await handler({ query: { q: 'te' }, user: { userId: 'u1' }, session: { lang: 'en' } } as any, reply as any)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags[0].name).toBe('Test')
  })
})

describe('POST /tags', () => {
  it('creates tag', async () => {
    const handler = fastify.routes['POST /']
    mockTagService.create.mockResolvedValue({ id: 'ck1234567890abcd12345679', name: 'Foo', slug: 'foo', translations: [{ name: 'Test' }]  })
    await handler({ user: { userId: 'u1' }, session: { lang: 'en' }, body: { name: 'Foo' } } as any, reply as any)
    console.log(reply.payload)
    expect(reply.payload.success).toBe(true)
    expect(mockTagService.create).toHaveBeenCalledWith('en', { name: 'Foo', createdBy: 'u1', isUserCreated: true, originalLocale: 'en' } as any)
  })
})
