import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('@shared/config/appconfig', () => ({ appConfig: { TYPEAHEAD_DEBOUNCE_MS: 300 } }))
import citiesRoutes from '../../api/routes/city.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockCityService: any

vi.mock('../../services/city.service', () => ({
  CityService: { getInstance: () => mockCityService },
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockCityService = { search: vi.fn(), findById: vi.fn(), create: vi.fn() }
  await citiesRoutes(fastify as any, {})
})

describe('GET /search', () => {
  it('returns mapped cities and sets debounce headers', async () => {
    const handler = fastify.routes['GET /search']
    mockCityService.search.mockResolvedValue([{ id: 'ckcity1234567890abcd123456', name: 'Test', country: 'US' }])
    await handler({ query: { q: 'Te', country: 'US' }, user: { userId: 'u1' } } as any, reply as any)
    expect(reply.headers['X-Debounce']).toBe('300')
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.cities[0].name).toBe('Test')
  })

  it('returns empty list when no cities found', async () => {
    const handler = fastify.routes['GET /search']
    mockCityService.search.mockResolvedValue([])
    await handler({ query: { q: 'zz', country: 'US' }, user: { userId: 'u1' } } as any, reply as any)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.cities).toEqual([])
  })
})

describe('POST /', () => {
  it('creates city for user', async () => {
    const handler = fastify.routes['POST /']
    mockCityService.create.mockResolvedValue({ id: 'ckcity234567890abcd123457', name: 'Foo', country: 'US' })
    await handler({ user: { userId: 'u1' }, body: { name: 'Foo', country: 'US' } } as any, reply as any)
    expect(mockCityService.create).toHaveBeenCalledWith({ name: 'Foo', country: 'US', createdBy: 'u1', isUserCreated: true })
    expect(reply.payload.success).toBe(true)
  })
})
