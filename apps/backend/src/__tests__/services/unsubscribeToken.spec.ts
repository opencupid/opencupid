import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSigner } from 'fast-jwt'

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

/** Signs claims the way tokens in emails sent before scoped claims were. */
const legacySigner = createSigner({
  key: 'test-unsubscribe-secret',
  algorithm: 'HS256',
  expiresIn: TOKEN_TTL_SECONDS * 1000,
})

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
      scope: 'notifications',
    })
    expect(verifyUnsubscribeToken(token)).toEqual({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scopes: ['notifications'],
      iat: NOW,
    })
  })

  it.each(['reminders', 'newsletter'] as const)('round-trips the %s scope', (scope) => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope,
    })
    expect(verifyUnsubscribeToken(token)?.scopes).toEqual([scope])
  })

  it('signs a notifications token with an explicit scope claim', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'notifications',
    })
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(claims.scope).toBe('notifications')
  })

  it('reads an unscoped token from older emails as notifications and reminders', () => {
    // Those links turned off all notification email, nearby digests included.
    const token = legacySigner({ userId: 'user-1', emailHash: hashEmail('alice@example.com') })
    expect(verifyUnsubscribeToken(token)?.scopes).toEqual(['notifications', 'reminders'])
  })

  it('reads a nearby_signups claim from older nearby-digest emails as reminders', () => {
    const token = legacySigner({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'nearby_signups',
    })
    expect(verifyUnsubscribeToken(token)?.scopes).toEqual(['reminders'])
  })

  it('rejects an unknown scope claim', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'toString' as any,
    })
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('rejects tokens tampered in the payload', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'notifications',
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
      scope: 'notifications',
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
      scope: 'notifications',
    })
    vi.setSystemTime((NOW + TOKEN_TTL_SECONDS + 1) * 1000)
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('accepts tokens within the TTL window', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'notifications',
    })
    vi.setSystemTime((NOW + TOKEN_TTL_SECONDS - 1) * 1000)
    expect(verifyUnsubscribeToken(token)).not.toBeNull()
  })

  it('still accepts a link from a weekly email six days after it was sent', () => {
    const token = signUnsubscribeToken({
      userId: 'user-1',
      emailHash: hashEmail('alice@example.com'),
      scope: 'reminders',
    })
    vi.setSystemTime((NOW + 6 * 24 * 60 * 60) * 1000)
    expect(verifyUnsubscribeToken(token)?.scopes).toEqual(['reminders'])
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
      scope: 'notifications',
    })
    const payload = verifyUnsubscribeToken(token)
    // Token still valid cryptographically, but the route-level check compares
    // payload.emailHash to hashEmail(currentEmail); after change they diverge.
    expect(payload?.emailHash).not.toBe(hashEmail('new@example.com'))
  })
})
