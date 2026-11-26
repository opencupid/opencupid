import { createHash } from 'crypto'
import { createSigner, createVerifier } from 'fast-jwt'
import { appConfig } from '@/lib/appconfig'
import { canonicalizeEmail } from '@/lib/email'
import { EMAIL_SCOPES, type EmailScope } from '@zod/user/emailPreference.dto'

/** Token format: the email scope the link turns off is carried as a `scope` claim. */
const CLAIM_SCOPES: ReadonlySet<string> = new Set<EmailScope>(EMAIL_SCOPES)

export type UnsubscribePayload = {
  userId: string
  emailHash: string
  /** What the link turns off; the first scope picks the confirmation copy. */
  scopes: readonly EmailScope[]
  /** Unix seconds — set by fast-jwt as the standard `iat` claim. */
  iat: number
}

/**
 * How long an unsubscribe link keeps working. A link can only turn emails
 * off, so it stays valid well past when the email is read: 60 days.
 */
export const TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60

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
export function signUnsubscribeToken(payload: {
  userId: string
  emailHash: string
  scope: EmailScope
}): string {
  return signer(payload)
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  try {
    const { userId, emailHash, scope, iat } = verifier(token) as Omit<
      UnsubscribePayload,
      'scopes'
    > & {
      scope?: string
    }
    if (scope === undefined || !CLAIM_SCOPES.has(scope)) return null
    return { userId, emailHash, scopes: [scope as EmailScope], iat }
  } catch {
    return null
  }
}
