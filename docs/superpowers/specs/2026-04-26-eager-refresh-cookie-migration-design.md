# Eager `__refresh` Cookie Migration

**Status:** Design
**Date:** 2026-04-26
**Author:** brainstormed with Claude
**Related:** PR #1353 (silent cookie migration to domain-scoped session cookies)

## Problem

PR #1353 migrates the `__session` cookie from host-only to domain-scoped on every authenticated request, but the sibling `__refresh` cookie is only re-stamped by the `/verify-token` and `/refresh` route handlers. Active users whose JWT has not yet expired still carry a host-only `__refresh` cookie from the pre-migration shape, sometimes for the full 30-day JWT TTL.

This blocks an upcoming host migration: if we move the apex domain or change which subdomain serves auth before every active client has a domain-scoped `__refresh`, those clients will silently lose their refresh token (the host-only cookie won't be sent to the new host) and be forced to re-authenticate.

## Goal

Eagerly migrate `__refresh` to the domain-scoped shape on the same hot path that already migrates `__session`, so that the host migration can proceed without forcing existing sessions to re-auth.

## Non-Goals

- Permanent re-stamping of `__refresh`. This is migration-only and gets deleted at the existing 2026-07-22 sunset.
- Changing refresh-token rotation semantics. Token value, server-side TTL, and `RefreshTokenService` behavior are untouched.
- Frontend changes. The frontend already handles both cookie shapes (PR #1353).
- Bearer-only client observability. The Bearer fallback is itself slated for retirement (TODO 2026-05-05 in `session-auth.ts:53`).

## Design

### New helper: `restampRefreshCookieIfPresent`

Lives in `apps/backend/src/lib/session-legacy.ts` next to `clearLegacyCookie`, for symmetry with the rest of the migration scaffolding. Deleting `session-legacy.ts` at sunset removes the helper, and the import in `session-auth.ts` fails loudly — the same forcing function the existing migration code relies on.

Behavior:

1. Read `__refresh` from the request via the existing `getRefreshCookie` helper.
2. If absent (Bearer-only client, or simply no refresh cookie set), return — silent skip.
3. If `canScopeToDomain(NODE_ENV, DOMAIN)` returns false (development, missing `DOMAIN`), return — no migration to perform.
4. Otherwise call `setRefreshCookie(reply, sameValue)`.

`setRefreshCookie` already routes through `currentSessionCookieOpts` (one truth source for the new shape) and already invokes `clearLegacyCookie(reply, REFRESH_COOKIE)` to evict the legacy host-only slot. Re-using it means there is exactly one place that decides what a "current-shape `__refresh` cookie" looks like.

The token value is unchanged. There is no Redis write, no `RefreshTokenService.create` call, no JWT verification — purely a cookie-attribute restamp. Browsers key cookies by `(name, Domain, Path)`, so writing the new domain-scoped slot and clearing the old host-only slot in the same response moves the client cleanly onto the new shape.

### Call site

One new line in the `authenticate` hook in `apps/backend/src/plugins/session-auth.ts`, immediately after the existing `setSessionCookie(reply, sessionId)` call (around line 104). The hook's existing comment block — which today documents the three jobs of the `__session` re-stamp (sliding TTL, Phase-1 shape migration, Phase-0 Bearer→cookie migration) — gets a brief extension noting that the new `__refresh` restamp serves the same Phase-1 purpose for the refresh cookie.

The call only fires after the full auth chain succeeds, so failed-auth responses do not emit a `Set-Cookie: __refresh`.

### Why hot-path

The hot-path is the only place where every active client is guaranteed to be touched within the migration window without requiring the JWT to expire first. The `/verify-token` route only fires on full re-login; the `/refresh` route only fires when the JWT actually expires. Both miss the population this design exists to migrate: active users whose JWT is still valid.

## Edge Cases

- **Bearer-only client.** No `__refresh` cookie sent → helper returns at step 2 → no migration performed. Acceptable: these clients are also slated for sunset (TODO 2026-05-05).
- **Development environment.** `canScopeToDomain` returns false → helper returns at step 3 → no `Set-Cookie: __refresh` emitted on every authenticated request. Keeps dev DevTools traces clean.
- **Coexisting cookie slots mid-migration.** Browser sends one `__refresh` value (whichever slot it picked); helper restamps with that value into the new slot and clears the old. Same mechanism PR #1353 already relies on for `__session`.
- **Already-migrated client.** Browser sends domain-scoped `__refresh`; helper restamps the new slot with the same value (idempotent) and emits a `clearCookie` for the host-only slot (which has no effect because the slot is already empty). One redundant `Set-Cookie` per request during the migration window — acceptable cost.

## Tests

Three new cases in `apps/backend/src/__tests__/routes/auth.route.spec.ts`, mirroring the shape of the existing `__session` migration tests:

1. **Authenticated request with legacy `__refresh` present, production-shaped DOMAIN.** Assert `reply.cookies` contains a `__refresh` entry with `domain: '.example.org'` and `reply.clearedCookies` contains a host-only `__refresh` clear.
2. **Authenticated request with no `__refresh` cookie (Bearer-only client).** Assert no `__refresh` entries appear in `reply.cookies` or `reply.clearedCookies`. Confirms the silent-skip branch.
3. **Authenticated request in development (`canScopeToDomain` false).** Assert no `__refresh` re-stamp happens even when the cookie is present. Confirms the dev-environment gate and prevents a future "simplification" from removing it.

No new test infrastructure required — the existing `FastifyReply` mock in `apps/backend/src/test-utils/fastify.ts` already records `cookies` and `clearedCookies`.

## Sunset

The new helper is deleted as part of `apps/backend/src/lib/session-legacy.ts` removal on 2026-07-22 (the date already anchored in `session-legacy.ts:10-14`). The single call site in `session-auth.ts` is removed in the same change; the import will fail loudly, surfacing any stragglers.

## Blast Radius

- 1 new helper (~10 lines) in `apps/backend/src/lib/session-legacy.ts`
- 1 new line in `apps/backend/src/plugins/session-auth.ts` `authenticate` hook + extended comment
- 3 new test cases in `apps/backend/src/__tests__/routes/auth.route.spec.ts`
- 1 changeset entry (`patch` to `@opencupid/backend`)

No frontend changes. No schema changes. No service changes. No new dependencies.
