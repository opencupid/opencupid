import { describe, expect, it, vi } from 'vitest'
import { MockReply } from '../../test-utils/fastify'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    NODE_ENV: 'production',
    DOMAIN: 'gaians.test',
    BRANDS: [
      {
        domain: 'gaians.test',
        siteName: 'Gaians',
        frontendUrl: 'https://gaians.test',
        emailFrom: 'Gaians <hello@gaians.test>',
      },
      {
        domain: 'komaterkep.test',
        siteName: 'Komatérkép',
        frontendUrl: 'https://komaterkep.test',
        emailFrom: 'Komatérkép <hello@komaterkep.test>',
      },
    ],
  },
}))

import {
  clearRefreshCookie,
  clearSessionCookie,
  setRefreshCookie,
  setSessionCookie,
} from '../../lib/session'
import { UnknownHostError } from '../../lib/brand'

function replyFor(hostname: string) {
  const reply = new MockReply()
  reply.request.hostname = hostname
  return reply
}

describe('session cookies', () => {
  it('scope to the domain of the brand the request was made to', () => {
    for (const [host, domain] of [
      ['gaians.test', '.gaians.test'],
      ['komaterkep.test', '.komaterkep.test'],
      ['www.komaterkep.test', '.komaterkep.test'],
    ]) {
      const reply = replyFor(host)
      setSessionCookie(reply as any, 'jwt')
      setRefreshCookie(reply as any, 'refresh')
      clearSessionCookie(reply as any)
      clearRefreshCookie(reply as any)
      expect(reply.cookies.map((c) => c.opts.domain)).toEqual([domain, domain])
      expect(reply.clearedCookies.map((c) => c.opts.domain)).toEqual([domain, domain])
    }
  })

  it('refuses to set a cookie for a host no brand serves', () => {
    const reply = replyFor('nowhere.test')
    expect(() => setSessionCookie(reply as any, 'jwt')).toThrow(UnknownHostError)
    expect(reply.cookies).toEqual([])
  })
})
