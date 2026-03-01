# Design: Align Local Type-Check with CI

**Date:** 2026-03-01
**Status:** Approved

## Problem

`vue-tsc` (run implicitly inside `pnpm build` in CI) is stricter than Vitest's runtime. It
type-checks test fixtures via `tsconfig.vitest.json` — a project reference included in the
root `tsconfig.json`. Vitest just transpiles and never errors on partial/mistyped objects.

As a result: tests pass locally but type-check fails in CI after a push.

The root cause is that CI runs `vue-tsc` embedded inside `pnpm build`, while local developer
workflows (`pnpm lint`, `pnpm test`) never invoke `vue-tsc` at all. The `ci:test` script runs
`turbo run type-check` but its ordering and steps diverge from CI.

## Design (Approach A)

### `.github/workflows/test.yml`

1. Add an explicit **Type check** step (`turbo run type-check --concurrency 1`) after lint.
2. Gate it with `if: github.event_name == 'pull_request'` — skip on push to main (already
   validated during the PR).
3. Change Build frontend from `pnpm build` → `pnpm build-only` (vite only; no redundant
   vue-tsc since type-check is now its own step).

### `package.json` — `ci:test` script

Rewrite to mirror CI steps exactly, in the same order:

```
pnpm install &&
pnpm --filter backend prisma:generate &&
pnpm lint &&
turbo run type-check --concurrency 1 &&
pnpm --filter frontend exec pnpm build-only &&
pnpm --filter backend exec vitest run &&
pnpm --filter frontend exec vitest run &&
pnpm i18n:check && pnpm i18n:check:api
```

### `CLAUDE.md`

- Update the Tests section to document `turbo run type-check --concurrency 1` as the
  type-check command.
- Update the PR finalization workflow to explicitly call out running type-check before pushing.

## What does NOT change

- `pnpm lint` — stays ESLint only (fast, daily use)
- `pnpm test` — stays turbo parallel (daily use)
- Frontend `build` script in `package.json` — still runs `run-p type-check build-only`
  (unchanged for anyone calling `pnpm build` directly, e.g. Docker builds)
