import { createHash } from 'crypto'
import { createSigner, createVerifier } from 'fast-jwt'
import { appConfig } from '@/lib/appconfig'
import { canonicalizeEmail } from '@/lib/email'
import { EMAIL_SCOPES, type EmailScope } from '@zod/user/emailPreference.dto'

/**
 * Token format: the email scope the link turns off is carried as a `scope`
 * claim; a token without one turns off notifications.
 *
 * TODO(#email-preferences contract PR): drop `nearby_signups`. Links in
 * nearby-digest emails sent before the reminders scope existed carry it; they
 * expire TOKEN_TTL_SECONDS after the deploy.
 */
const CLAIM_SCOPES: ReadonlyMap<string, EmailScope> = new Map([
  ...EMAIL_SCOPES.map((scope) => [scope, scope] as const),
  ['nearby_signups', 'reminders'],
])

export type UnsubscribePayload = {
  userId: string
  emailHash: string
  scope: EmailScope
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
export function signUnsubscribeToken({
  scope,
  ...payload
}: Omit<UnsubscribePayload, 'iat'>): string {
  return signer(scope === 'notifications' ? { ...payload } : { ...payload, scope })
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  try {
    const { userId, emailHash, scope, iat } = verifier(token) as Omit<
      UnsubscribePayload,
      'scope'
    > & {
      scope?: string
    }
    if (scope === undefined) return { userId, emailHash, scope: 'notifications', iat }
    const resolved = CLAIM_SCOPES.get(scope)
    return resolved ? { userId, emailHash, scope: resolved, iat } : null
  } catch {
    return null
  }
}
