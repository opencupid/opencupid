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

/** Base cookie options reused by frontend (universal-cookie) and backend (fastify). */
export const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'strict' as const }
