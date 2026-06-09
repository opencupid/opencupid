import { createHash } from 'crypto'
import { createSigner, createVerifier } from 'fast-jwt'
import { appConfig } from '@/lib/appconfig'
import { canonicalizeEmail } from '@/lib/email'

export type UnsubscribePayload = {
  userId: string
  emailHash: string
  /** Unix seconds — set by fast-jwt as the standard `iat` claim. */
  iat: number
}

export const TOKEN_TTL_SECONDS = 2 * 24 * 60 * 60

const signer = createSigner({
  key: appConfig.UNSUBSCRIBE_SECRET,
  algorithm: 'HS256',
  expiresIn: TOKEN_TTL_SECONDS * 1000,
})

const verifier = createVerifier({
  key: appConfig.UNSUBSCRIBE_SECRET,
  algorithms: ['HS256'],
})

/**
 * Derive a stable per-email fingerprint from the canonical form of the
 * address (see canonicalizeEmail). Changing to an address with a different
 * canonical form changes the fingerprint, which implicitly revokes
 * outstanding unsubscribe tokens issued against the old address. Gmail
 * variants that share a canonical form (dots, +suffix, case) keep the same
 * fingerprint and do not revoke.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(canonicalizeEmail(email)).digest('base64url').slice(0, 22)
}

/**
 * Sign an unsubscribe token. Stateless and single-purpose — signed with a
 * dedicated UNSUBSCRIBE_SECRET disjoint from JWT_SECRET so it cannot be
 * reused to authenticate a session.
 */
export function signUnsubscribeToken(payload: Omit<UnsubscribePayload, 'iat'>): string {
  return signer({ ...payload })
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  try {
    const { userId, emailHash, iat } = verifier(token) as UnsubscribePayload
    return { userId, emailHash, iat }
  } catch {
    return null
  }
}
