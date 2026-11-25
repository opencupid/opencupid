import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

const mockService = vi.hoisted(() => ({ getStatistics: vi.fn() }))
vi.mock('@/services/statistics.service', () => ({
  StatisticsService: { getInstance: () => mockService },
}))

import adminStatisticsRoutes from '../../../api/routes/admin/statistics.route'

let fastify: MockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockService.getStatistics.mockReset()
  await adminStatisticsRoutes(fastify as any, {})
})

const get = (query: Record<string, string> = {}) =>
  fastify.routes['GET /']!({ query } as any, reply as any)

describe('GET /admin/statistics', () => {
  it('returns the statistics for the given filter', async () => {
    mockService.getStatistics.mockResolvedValue({ origins: [] })
    await get({ origin: 'a.example', segment: 'frequent' })
    expect(mockService.getStatistics).toHaveBeenCalledWith({
      origin: 'a.example',
      segment: 'frequent',
    })
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, statistics: { origins: [] } })
  })

  it('rejects an unknown segment', async () => {
    await get({ segment: 'nope' })
    expect(reply.statusCode).toBe(400)
    expect(mockService.getStatistics).not.toHaveBeenCalled()
  })

  it('returns 500 when the service fails', async () => {
    mockService.getStatistics.mockRejectedValue(new Error('db down'))
    await get()
    expect(reply.statusCode).toBe(500)
  })
})
