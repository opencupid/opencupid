/** Cookie name for the JWT session — shared between frontend and backend. */
export const SESSION_COOKIE = '__session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Cookie name for the opaque refresh token (httpOnly, not readable by JS). */
export const REFRESH_COOKIE = '__refresh'
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 90 // 90 days

/**
 * Cookie name for the cross-brand origin marker. Set when the serving brand
 * detects that a returning user's origin domain differs from its own, so
 * downstream bridges can redirect the browser back to the user's home brand.
 */
export const ORIGIN_COOKIE = '__o'
export const ORIGIN_MAX_AGE = 60 * 60 * 24 * 365 * 10 // 10 years

/**
 * Base cookie options for the session cookie. `sameSite: 'lax'` lets magic
 * links opened from email clients still carry the cookie on the top-level
 * navigation; `strict` would block them.
 */
export const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'lax' as const }

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function normalizeDomain(domain: string): string {
  return domain.trim().replace(/^\.+/, '')
}

/**
 * Decide whether the session cookie should carry a `Domain` attribute. Each
 * branch documents a separate reason we would refuse to domain-scope the
 * cookie. Self-normalizes the input so callers can pass either `example.org`
 * or `.example.org` interchangeably.
 *
 * `nodeEnv` / `domain` are passed in so this module stays free of runtime
 * config imports — packages/shared must not depend on apps/*.
 */
export function canScopeToDomain(nodeEnv: string, domain: string): boolean {
  // Vite dev server serves from `localhost` regardless of the DOMAIN env
  // value, so dev must stay host-only.
  if (nodeEnv === 'development') return false
  const normalized = normalizeDomain(domain)
  // Empty after normalization — nothing to attach.
  if (normalized.length === 0) return false
  // Loopback literals — browsers silently drop `Domain=.localhost` etc.
  if (LOCAL_HOSTS.has(normalized)) return false
  // Single-label hosts — browsers silently drop `Domain=.example`.
  if (!normalized.includes('.')) return false
  return true
}

/**
 * Compose the session cookie's options for the caller's environment. Attaches
 * `Domain=.<apex>` when `canScopeToDomain` approves, otherwise returns host-
 * only options. Callers that also need to gate on the same decision (e.g. a
 * legacy-host-only clearCookie during the migration) call `canScopeToDomain`
 * directly with the same inputs.
 */
export function resolveSessionCookie(nodeEnv: string, domain: string) {
  if (!canScopeToDomain(nodeEnv, domain)) return { ...SESSION_COOKIE_OPTS }
  return { ...SESSION_COOKIE_OPTS, domain: `.${normalizeDomain(domain)}` }
}
