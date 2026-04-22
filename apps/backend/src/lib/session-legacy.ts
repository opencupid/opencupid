/**
 * Backend adapter for the Phase 1 silent cookie migration (issue #1351).
 *
 * Closes over `appConfig` so route handlers can emit the legacy host-only
 * clear with a single call. Pairs with `apps/frontend/src/lib/session-legacy.ts`
 * — delete both files together once the migration window has elapsed; every
 * import will fail loudly, pointing at call sites that still emit legacy
 * behavior.
 */
import { FastifyReply } from 'fastify'
import { canScopeToDomain } from '@shared/session'
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
