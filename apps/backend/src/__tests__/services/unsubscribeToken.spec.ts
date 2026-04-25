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
      iat: NOW,
    })
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

  it('hashEmail is stable, lowercase- and whitespace-normalized', () => {
    expect(hashEmail('Alice@Example.com')).toBe(hashEmail('  alice@example.com  '))
    expect(hashEmail('alice@example.com')).not.toBe(hashEmail('bob@example.com'))
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
