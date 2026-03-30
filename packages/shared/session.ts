/** Cookie name for the JWT session — shared between frontend, backend, and ingress. */
export const SESSION_COOKIE = '__session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Cookie name for the opaque refresh token (httpOnly, not readable by JS). */
export const REFRESH_COOKIE = '__refresh'
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 90 // 90 days

/** Base cookie options reused by frontend (universal-cookie) and backend (fastify). */
export const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'strict' as const }
