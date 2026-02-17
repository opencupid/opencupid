import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@fastify/rate-limit', () => ({
  default: 'mock-rate-limit-plugin',
}))

import ratelimit from '@fastify/rate-limit'
import tilesPlugin from '../../plugins/tiles-proxy'

describe('tilesProxy plugin', () => {
  let fastify: {
    register: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    log: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    fastify = {
      register: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      log: {
        warn: vi.fn(),
        error: vi.fn(),
      },
    }
  })

  it('registers local rate limiter and applies route-level limits', async () => {
    await tilesPlugin(fastify as any)

    expect(fastify.register).toHaveBeenCalledWith(ratelimit, {
      global: false,
    })

    const [path, options, handler] = fastify.get.mock.calls[0]
    expect(path).toBe('/api/tiles/:z/:x/:y.png')
    expect(options).toMatchObject({
      config: {
        rateLimit: {
          max: 100,
          timeWindow: '1 second',
        },
      },
    })
    expect(typeof handler).toBe('function')
  })
})
