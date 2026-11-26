import { createHash } from 'crypto'
import { createSigner, createVerifier } from 'fast-jwt'
import { appConfig } from '@/lib/appconfig'
import { canonicalizeEmail } from '@/lib/email'
import { EMAIL_SCOPES, type EmailScope } from '@zod/user/emailPreference.dto'

/**
 * Token format: the email scope the link turns off is carried as a `scope`
 * claim.
 *
 * TODO(#email-preferences contract PR): drop the two legacy formats below.
 * Links in emails sent before the EmailPreference deploy carry them and expire
 * TOKEN_TTL_SECONDS after it:
 * - no claim: turned off all notification email, which also stopped nearby
 *   digests, so it keeps turning off both notifications and reminders;
 * - `nearby_signups`: nearby digests only, now the reminders scope.
 */
const CLAIM_SCOPES: ReadonlyMap<string, readonly EmailScope[]> = new Map([
  ...EMAIL_SCOPES.map((scope) => [scope, [scope]] as const),
  ['nearby_signups', ['reminders']],
])
const UNSCOPED_LEGACY_SCOPES: readonly EmailScope[] = ['notifications', 'reminders']

export type UnsubscribePayload = {
  userId: string
  emailHash: string
  /** What the link turns off; the first scope picks the confirmation copy. */
  scopes: readonly EmailScope[]
  /** Unix seconds — set by fast-jwt as the standard `iat` claim. */
  iat: number
}

/** Long enough that a link in a weekly email still works until the next one. */
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

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
    const scopes = scope === undefined ? UNSCOPED_LEGACY_SCOPES : CLAIM_SCOPES.get(scope)
    return scopes ? { userId, emailHash, scopes, iat } : null
  } catch {
    return null
  }
}
