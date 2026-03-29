/** Cookie name for the JWT session — shared between frontend, backend, and ingress. */
export const SESSION_COOKIE = '__session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Base cookie options reused by frontend (universal-cookie) and backend (fastify). */
export const SESSION_COOKIE_OPTS = { path: '/', sameSite: 'strict' as const }
