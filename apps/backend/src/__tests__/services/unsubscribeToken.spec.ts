import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
  },
}))

import {
  TOKEN_TTL_SECONDS,
  hashEmail,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '@/services/email/unsubscribeToken'

const NOW = 1_700_000_000

describe('unsubscribeToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW * 1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('round-trips a signed payload', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
    })
    expect(verifyUnsubscribeToken(token)).toEqual({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'all',
      iat: NOW,
    })
  })

  it('round-trips a narrow scope', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'nearby_signups',
    })
    expect(verifyUnsubscribeToken(token)?.scope).toBe('nearby_signups')
  })

  it("signs an 'all' token without a scope claim", () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'all',
    })
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(claims).not.toHaveProperty('scope')
  })

  it('rejects tokens tampered in the payload', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
    })
    const [header, , sig] = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'attacker', emailHash: 'x', iat: NOW })
    ).toString('base64url')
    expect(verifyUnsubscribeToken(`${header}.${tamperedPayload}.${sig}`)).toBeNull()
  })

  it('rejects tokens tampered in the signature', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
    })
    const [header, payloadB64] = token.split('.')
    const badSig = Buffer.alloc(32).toString('base64url')
    expect(verifyUnsubscribeToken(`${header}.${payloadB64}.${badSig}`)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(verifyUnsubscribeToken('garbage')).toBeNull()
    expect(verifyUnsubscribeToken('only.two')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
  })

  it('rejects tokens older than the TTL', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
    })
    vi.setSystemTime((NOW + TOKEN_TTL_SECONDS + 1) * 1000)
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('accepts tokens within the TTL window', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
    })
    vi.setSystemTime((NOW + TOKEN_TTL_SECONDS - 1) * 1000)
    expect(verifyUnsubscribeToken(token)).not.toBeNull()
  })

  it('still accepts a link from a weekly email six days after it was sent', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'nearby_signups',
    })
    vi.setSystemTime((NOW + 6 * 24 * 60 * 60) * 1000)
    expect(verifyUnsubscribeToken(token)?.scope).toBe('nearby_signups')
  })

  it('hashEmail is stable, lowercase- and whitespace-normalized', () => {
    expect(hashEmail('Alice@Example.com')).toBe(hashEmail('  alice@example.com  '))
    expect(hashEmail('alice@example.com')).not.toBe(hashEmail('bob@example.com'))
  })

  it('hashEmail unifies Gmail dot and plus variants', () => {
    expect(hashEmail('j.smith@gmail.com')).toBe(hashEmail('jsmith@gmail.com'))
    expect(hashEmail('jsmith+promo@gmail.com')).toBe(hashEmail('jsmith@gmail.com'))
    expect(hashEmail('J.Smith+x@Googlemail.com')).toBe(hashEmail('jsmith@googlemail.com'))
  })

  it('hashEmail still distinguishes non-Gmail dotted addresses', () => {
    expect(hashEmail('foo.bar@example.com')).not.toBe(hashEmail('foobar@example.com'))
  })

  it('email fingerprint invalidates tokens on address change', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('old@example.com'),
    })
    const payload = verifyUnsubscribeToken(token)
    // Token still valid cryptographically, but the route-level check compares
    // payload.emailHash to hashEmail(currentEmail); after change they diverge.
    expect(payload?.emailHash).not.toBe(hashEmail('new@example.com'))
  })
})
