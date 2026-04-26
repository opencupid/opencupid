/**
 * Backend adapter for the Phase 1 silent cookie migration (issue #1351).
 *
 * Closes over `appConfig` so route handlers can emit the legacy host-only
 * clear with a single call. Pairs with `apps/frontend/src/lib/session-legacy.ts`
 * — delete both files together once the migration window has elapsed; every
 * import will fail loudly, pointing at call sites that still emit legacy
 * behavior.
 *
 * TODO(2026-07-22): Retire this file + the frontend sibling. The date is
 * anchored to ~90 days after Phase 1 deploy (refresh-token TTL), by which
 * point every active user is on the domain-scoped shape and any dormant
 * host-only refresh token has expired. Bump this date forward if the PR
 * #1353 merge slips materially past 2026-04-22.
 */
import { FastifyReply, FastifyRequest } from 'fastify'
import {
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  canScopeToDomain,
  resolveSessionCookie,
} from '@shared/session'
import { appConfig } from '@/lib/appconfig'

/**
 * Options that identify the pre-migration host-only cookie slot. Browsers key
 * cookies by (name, Domain, Path); matching Path is sufficient for deletion.
 *
 * Duplicated (verbatim) in the frontend adapter rather than shared so that
 * deleting this file removes every trace of the migration — no orphaned
 * shared helper gets left behind by accident.
 */
const LEGACY_HOST_ONLY_COOKIE_OPTS = { path: '/' }

export function clearLegacyCookie(reply: FastifyReply, name: string): void {
  // No-op when the new shape is itself host-only (dev / unusable DOMAIN) so
  // the clear never collides with the just-set cookie's (name, Domain, Path)
  // slot.
  if (!canScopeToDomain(appConfig.NODE_ENV, appConfig.DOMAIN)) return
  reply.clearCookie(name, LEGACY_HOST_ONLY_COOKIE_OPTS)
}

/**
 * Hot-path migration: re-stamp `__refresh` with the current domain-scoped
 * shape on every authenticated request, and clear the pre-migration host-only
 * slot. Mirrors the eager migration that PR #1353 wires for `__session`,
 * extending it to `__refresh` so that a planned host migration does not force
 * existing sessions to re-authenticate.
 *
 * The cookie shape is inlined here (rather than delegating to
 * `setRefreshCookie` in `./session`) because `./session` already imports from
 * this file — delegating would create a circular import. The duplication is
 * bounded by the same 2026-07-22 sunset that retires the rest of this file.
 */
export function restampRefreshCookieIfPresent(req: FastifyRequest, reply: FastifyReply): void {
  if (!canScopeToDomain(appConfig.NODE_ENV, appConfig.DOMAIN)) return
  const value = req.cookies[REFRESH_COOKIE]
  if (!value) return
  reply.setCookie(REFRESH_COOKIE, value, {
    ...resolveSessionCookie(appConfig.NODE_ENV, appConfig.DOMAIN),
    httpOnly: true,
    secure: appConfig.NODE_ENV !== 'development',
    maxAge: REFRESH_MAX_AGE,
  })
  reply.clearCookie(REFRESH_COOKIE, LEGACY_HOST_ONLY_COOKIE_OPTS)
}
