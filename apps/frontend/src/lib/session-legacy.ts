/**
 * Frontend adapter for the Phase 1 silent cookie migration (issue #1351).
 *
 * Closes over `__APP_CONFIG__` so logout / refresh-failure paths can zap the
 * pre-migration host-only slot with a single call. Pairs with
 * `apps/backend/src/lib/session-legacy.ts` — delete both files together once
 * the migration window has elapsed; every import will fail loudly, pointing
 * at call sites that still emit legacy behavior.
 *
 * TODO(2026-07-22): Retire this file + the backend sibling. The date is
 * anchored to ~90 days after Phase 1 deploy (refresh-token TTL), by which
 * point every active user is on the domain-scoped shape and any dormant
 * host-only refresh token has expired. Bump this date forward if the PR
 * #1353 merge slips materially past 2026-04-22.
 */
import type Cookies from 'universal-cookie'
import { canScopeToDomain } from '@shared/session'

/**
 * Options that identify the pre-migration host-only cookie slot. Browsers key
 * cookies by (name, Domain, Path); matching Path is sufficient for deletion.
 *
 * Duplicated (verbatim) in the backend adapter rather than shared so that
 * deleting this file removes every trace of the migration — no orphaned
 * shared helper gets left behind by accident.
 */
const LEGACY_HOST_ONLY_COOKIE_OPTS = { path: '/' }

export function clearLegacyCookie(cookies: Cookies, name: string): void {
  // No-op when the active shape is itself host-only (dev / unusable DOMAIN)
  // so the remove never targets the same slot as the just-removed active
  // shape.
  if (!canScopeToDomain(__APP_CONFIG__.NODE_ENV, __APP_CONFIG__.DOMAIN)) return
  cookies.remove(name, LEGACY_HOST_ONLY_COOKIE_OPTS)
}
