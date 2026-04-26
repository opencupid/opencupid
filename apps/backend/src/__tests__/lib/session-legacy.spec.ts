import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockReply } from '../../test-utils/fastify'
import { appConfig } from '@/lib/appconfig'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    NODE_ENV: 'production',
    DOMAIN: 'example.org',
  },
}))

import { restampRefreshCookieIfPresent } from '../../lib/session-legacy'

let reply: MockReply

beforeEach(() => {
  reply = new MockReply()
  appConfig.NODE_ENV = 'production'
  appConfig.DOMAIN = 'example.org'
})

describe('restampRefreshCookieIfPresent', () => {
  it('re-stamps __refresh with Domain attribute and clears the legacy host-only slot when the cookie is present in production', () => {
    const req = { cookies: { __refresh: 'token-abc' } } as any

    restampRefreshCookieIfPresent(req, reply as any)

    const set = reply.cookies.find(c => c.name === '__refresh')
    expect(set).toBeDefined()
    expect(set!.value).toBe('token-abc')
    expect(set!.opts).toMatchObject({
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
      domain: '.example.org',
    })
    expect(set!.opts.maxAge).toBe(60 * 60 * 24 * 90)

    const cleared = reply.clearedCookies.find(c => c.name === '__refresh')
    expect(cleared).toBeDefined()
    expect(cleared!.opts).toEqual({ path: '/' })
  })

  it('does nothing when the request has no __refresh cookie (Bearer-only client)', () => {
    const req = { cookies: {} } as any

    restampRefreshCookieIfPresent(req, reply as any)

    expect(reply.cookies.find(c => c.name === '__refresh')).toBeUndefined()
    expect(reply.clearedCookies.find(c => c.name === '__refresh')).toBeUndefined()
  })

  it('does nothing in development even if __refresh is present (gate avoids self-collision in host-only environments)', () => {
    appConfig.NODE_ENV = 'development'
    const req = { cookies: { __refresh: 'token-abc' } } as any

    restampRefreshCookieIfPresent(req, reply as any)

    expect(reply.cookies.find(c => c.name === '__refresh')).toBeUndefined()
    expect(reply.clearedCookies.find(c => c.name === '__refresh')).toBeUndefined()
  })
})
