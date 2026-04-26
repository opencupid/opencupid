# Eager `__refresh` Cookie Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eagerly migrate the `__refresh` cookie from host-only to domain-scoped on every authenticated request, so a planned host migration can proceed without forcing existing sessions to re-authenticate.

**Architecture:** Add one migration-only helper `restampRefreshCookieIfPresent(req, reply)` next to `clearLegacyCookie` in `apps/backend/src/lib/session-legacy.ts`, and call it once in the `authenticate` hook in `apps/backend/src/plugins/session-auth.ts` immediately after the existing `setSessionCookie(reply, sessionId)` call. Both pieces are deleted together at the existing 2026-07-22 sunset.

**Tech Stack:** TypeScript, Fastify, Vitest. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-04-26-eager-refresh-cookie-migration-design.md](../specs/2026-04-26-eager-refresh-cookie-migration-design.md)

---

## File Map

- **Create:** `apps/backend/src/__tests__/lib/session-legacy.spec.ts` — unit tests for the new helper
- **Modify:** `apps/backend/src/lib/session-legacy.ts` — add `restampRefreshCookieIfPresent`
- **Modify:** `apps/backend/src/plugins/session-auth.ts` — call helper in `authenticate` hook
- **Create:** `.changeset/<random-words>.md` — patch bump for `@opencupid/backend`

The helper inlines its cookie shape (`httpOnly`, `secure`, `maxAge`, options) rather than delegating to `setRefreshCookie` from `session.ts`. Reason: `session.ts` already imports from `session-legacy.ts`, so the reverse import would create a cycle. The duplication is bounded — both the helper and the duplication die at sunset.

---

### Task 1: Unit-test `restampRefreshCookieIfPresent` (failing tests first)

**Files:**

- Create: `apps/backend/src/__tests__/lib/session-legacy.spec.ts`

The helper is a pure function over `(req, reply)` with `appConfig` as the only side input. We can test it directly with the existing `MockReply` from `apps/backend/src/test-utils/fastify.ts` and a hand-rolled request object — no Redis, no JWT, no plugin wiring needed.

- [ ] **Step 1: Write the failing test file**

Create `apps/backend/src/__tests__/lib/session-legacy.spec.ts` with this content:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockReply } from '../../test-utils/fastify'
import { appConfig } from '@/lib/appconfig'

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    NODE_ENV: 'production',
    DOMAIN: 'example.org',
  },
}))

import { restampRefreshCookieIfPresent } from '../../lib/session-legacy'

let reply: MockReply

beforeEach(() => {
  reply = new MockReply()
  appConfig.NODE_ENV = 'production'
  appConfig.DOMAIN = 'example.org'
})

describe('restampRefreshCookieIfPresent', () => {
  it('re-stamps __refresh with Domain attribute and clears the legacy host-only slot when the cookie is present in production', () => {
    const req = { cookies: { __refresh: 'token-abc' } } as any

    restampRefreshCookieIfPresent(req, reply as any)

    const set = reply.cookies.find(c => c.name === '__refresh')
    expect(set).toBeDefined()
    expect(set!.value).toBe('token-abc')
    expect(set!.opts).toMatchObject({
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
      domain: '.example.org',
    })
    expect(set!.opts.maxAge).toBe(60 * 60 * 24 * 90)

    const cleared = reply.clearedCookies.find(c => c.name === '__refresh')
    expect(cleared).toBeDefined()
    expect(cleared!.opts).toEqual({ path: '/' })
  })

  it('does nothing when the request has no __refresh cookie (Bearer-only client)', () => {
    const req = { cookies: {} } as any

    restampRefreshCookieIfPresent(req, reply as any)

    expect(reply.cookies.find(c => c.name === '__refresh')).toBeUndefined()
    expect(reply.clearedCookies.find(c => c.name === '__refresh')).toBeUndefined()
  })

  it('does nothing in development even if __refresh is present (gate avoids self-collision in host-only environments)', () => {
    appConfig.NODE_ENV = 'development'
    const req = { cookies: { __refresh: 'token-abc' } } as any

    restampRefreshCookieIfPresent(req, reply as any)

    expect(reply.cookies.find(c => c.name === '__refresh')).toBeUndefined()
    expect(reply.clearedCookies.find(c => c.name === '__refresh')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the new tests — they should fail with an import error**

Run:
```bash
pnpm --filter backend exec vitest run apps/backend/src/__tests__/lib/session-legacy.spec.ts
```
Expected: failure on import — `restampRefreshCookieIfPresent` is not exported from `session-legacy.ts`.

- [ ] **Step 3: Add the helper to `session-legacy.ts`**

Modify `apps/backend/src/lib/session-legacy.ts` by adding two new imports at the top and the new exported function below `clearLegacyCookie`. The full new file content is:

```ts
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
export function restampRefreshCookieIfPresent(
  req: FastifyRequest,
  reply: FastifyReply,
): void {
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
```

- [ ] **Step 4: Re-run the tests — they should now pass**

Run:
```bash
pnpm --filter backend exec vitest run apps/backend/src/__tests__/lib/session-legacy.spec.ts
```
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/session-legacy.ts apps/backend/src/__tests__/lib/session-legacy.spec.ts
git commit -m "feat(backend): add restampRefreshCookieIfPresent migration helper

Mirrors the existing __session hot-path migration for __refresh, so the
legacy host-only refresh cookie is replaced with the domain-scoped shape
on every authenticated request without rotating the underlying token.
Migration-only — sunsets together with session-legacy.ts on 2026-07-22."
```

---

### Task 2: Wire the helper into the `authenticate` hook

**Files:**

- Modify: `apps/backend/src/plugins/session-auth.ts:11` (import) and `apps/backend/src/plugins/session-auth.ts:91-105` (comment + new call)

The hot path lives in the `authenticate` decorator. We add one import and one call immediately after `setSessionCookie(reply, sessionId)`, and extend the existing comment block to mention `__refresh`.

- [ ] **Step 1: Update the import in `session-auth.ts`**

Modify `apps/backend/src/plugins/session-auth.ts` line 11. Change:

```ts
import { getSessionCookie, setSessionCookie } from '@/lib/session'
```

to:

```ts
import { getSessionCookie, setSessionCookie } from '@/lib/session'
import { restampRefreshCookieIfPresent } from '@/lib/session-legacy'
```

- [ ] **Step 2: Add the helper call and extend the comment**

In the same file, replace the block from line 91 through line 105 (the comment block plus `setSessionCookie(reply, sessionId)`). The current block reads:

```ts
      // Refresh the session cookie on every authenticated request. Three
      // jobs in one call:
      //   1. Sliding TTL — resets Max-Age to 30d so active users stay
      //      logged in as long as they keep using the app. Permanent
      //      behavior, survives post-migration sunset.
      //   2. Phase 1 shape migration — stamps the current domain-scoped
      //      shape and (inside `clearLegacyCookie`) wipes the legacy
      //      host-only slot when they're distinct.
      //   3. Phase 0 Bearer → cookie migration — clients that sent only
      //      an `Authorization: Bearer` header now carry a proper cookie
      //      on their next request.
      // Only runs after the full auth chain succeeds, so failed-auth
      // responses don't re-stamp a cookie the client can't use.
      setSessionCookie(reply, sessionId)
      await sessionService.refreshTtl(sessionId)
```

Replace with:

```ts
      // Refresh the session cookie on every authenticated request. Three
      // jobs in one call:
      //   1. Sliding TTL — resets Max-Age to 30d so active users stay
      //      logged in as long as they keep using the app. Permanent
      //      behavior, survives post-migration sunset.
      //   2. Phase 1 shape migration — stamps the current domain-scoped
      //      shape and (inside `clearLegacyCookie`) wipes the legacy
      //      host-only slot when they're distinct.
      //   3. Phase 0 Bearer → cookie migration — clients that sent only
      //      an `Authorization: Bearer` header now carry a proper cookie
      //      on their next request.
      // Only runs after the full auth chain succeeds, so failed-auth
      // responses don't re-stamp a cookie the client can't use.
      setSessionCookie(reply, sessionId)
      // Phase 1 shape migration for __refresh: same intent as job (2)
      // above but for the refresh cookie. Eager re-stamp here means a
      // planned host migration does not force active sessions to
      // re-authenticate. Sunsets together with `session-legacy.ts`.
      restampRefreshCookieIfPresent(req, reply)
      await sessionService.refreshTtl(sessionId)
```

- [ ] **Step 3: Type-check the backend to confirm the new wiring compiles**

Run:
```bash
pnpm --filter backend type-check
```
Expected: zero type errors.

- [ ] **Step 4: Run the full backend test suite to confirm no regressions**

Run:
```bash
pnpm --filter backend test
```
Expected: all tests pass (existing PR #1353 tests for `__session` migration remain green; new helper tests from Task 1 pass; nothing else regresses).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/plugins/session-auth.ts
git commit -m "feat(backend): eagerly migrate __refresh on the hot path

Calls restampRefreshCookieIfPresent in the authenticate hook so every
authenticated request migrates the refresh cookie to the domain-scoped
shape, mirroring the existing __session migration. Required before any
host migration that depends on cookies being sent across subdomains."
```

---

### Task 3: Add a changeset

**Files:**

- Create: `.changeset/eager-refresh-cookie-migration.md`

Per the project HARD RULE in `CLAUDE.md`, every PR that changes a service must include a changeset before merge. Bump type is `patch` — this is a migration-window improvement to existing behavior, not a new user-visible feature.

- [ ] **Step 1: Create the changeset file**

Run:
```bash
cat > .changeset/eager-refresh-cookie-migration.md << 'EOF'
---
'@opencupid/backend': patch
---

Eagerly migrate the __refresh cookie to the domain-scoped shape on every authenticated request so a planned host migration does not force existing sessions to re-authenticate.
EOF
```

- [ ] **Step 2: Commit the changeset**

```bash
git add .changeset/eager-refresh-cookie-migration.md
git commit -m "chore: add changeset for eager __refresh cookie migration"
```

---

### Task 4: Final verification + push + open PR

**Files:** none modified.

- [ ] **Step 1: Run the full project test suite**

Run:
```bash
pnpm test
```
Expected: all tests pass across all workspaces.

- [ ] **Step 2: Run type-check across the project**

Run:
```bash
pnpm type-check
```
Expected: zero type errors.

- [ ] **Step 3: Format only the modified files**

Run:
```bash
pnpm exec prettier --write \
  apps/backend/src/lib/session-legacy.ts \
  apps/backend/src/plugins/session-auth.ts \
  apps/backend/src/__tests__/lib/session-legacy.spec.ts
```
Expected: prettier rewrites or leaves untouched, exits 0.

- [ ] **Step 4: If formatting changed any files, commit them**

Run:
```bash
git status
```
If there are uncommitted changes, run:
```bash
git add -u apps/backend/src
git commit -m "chore: format modified files"
```
Otherwise skip.

- [ ] **Step 5: Push the branch**

Run:
```bash
git push -u origin feat/eager-refresh-cookie-migration
```
Expected: push succeeds.

- [ ] **Step 6: Open the PR**

Run:
```bash
gh pr create --title "feat(backend): eagerly migrate __refresh cookie on hot path" --body "$(cat <<'EOF'
## Summary
- Adds `restampRefreshCookieIfPresent` in `session-legacy.ts` and calls it on every authenticated request in the `authenticate` hook
- Mirrors the existing `__session` hot-path migration from PR #1353 — same gate (`canScopeToDomain`), same legacy clear, no token rotation
- Migration-only: helper and call site are deleted together at the existing 2026-07-22 sunset for `session-legacy.ts`

## Motivation
PR #1353 migrates `__session` eagerly but leaves `__refresh` on a lazy migration path that only fires when `/refresh` runs (i.e., when the JWT actually expires). That blocks any planned host migration: clients whose JWT is still valid would lose their host-only `__refresh` cookie when the apex domain or subdomain layout changes, and be forced to re-authenticate.

This PR closes that gap. After deploy, every authenticated request restamps `__refresh` into the new domain-scoped slot and clears the legacy host-only slot, so once active users have made a single authenticated request post-deploy, the host migration can proceed safely.

## Test plan
- [ ] `pnpm --filter backend test` — passes (3 new unit tests for the helper, no existing-test regressions)
- [ ] `pnpm type-check` — passes
- [ ] Spec: `docs/superpowers/specs/2026-04-26-eager-refresh-cookie-migration-design.md`
- [ ] Plan: `docs/superpowers/plans/2026-04-26-eager-refresh-cookie-migration.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR is created and the URL is printed. Capture the URL for the user.

- [ ] **Step 7: Report the PR URL**

Print the PR URL to the user and stop. Do not merge — per project memory, merging is the user's call.
