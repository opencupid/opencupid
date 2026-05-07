# Dependency upgrade strategy

Snapshot taken on 2026-05-07 from `pnpm outdated --recursive`. 100 packages
have updates available across the workspace (frontend, admin, backend, shared,
root).

The goal is to land these in **small, reviewable PRs** that map cleanly onto
the existing CI gates (`pnpm lint`, `pnpm type-check`, `pnpm test`,
`pnpm run ci:test`) — never one mega-bump PR.

---

## 1. Summary by risk class

### A. Deprecated — must be removed/replaced

| Package            | Current | Replacement                                                     |
| ------------------ | ------- | --------------------------------------------------------------- |
| `@types/dompurify` | 3.2.0   | Drop — `dompurify` ships its own types since v3                 |
| `cuid`             | 3.0.0   | Migrate to `@paralleldrive/cuid2` (or `nanoid`, already in use) |

`cuid` removal is a small data-touching change — audit Prisma defaults and any
existing IDs before swapping.

### B. Patch / minor — low risk, batch together

Roughly 55 entries. Examples: `vue` 3.5.28 → 3.5.34, `fastify` 5.7.4 → 5.8.5,
`axios` 1.13.5 → 1.16.0, `bullmq` 5.70.1 → 5.76.6, `@sentry/node` 10.39 →
10.52, `@vueuse/*` 14.2 → 14.3, `bootstrap` (none — already at 5.3.8 wanted),
`prettier` 3.8.1 → 3.8.3, `eslint` 10.0.2 → 10.3.0, `playwright` 1.58 → 1.59,
`turbo` 2.8.10 → 2.9.10, `dompurify` 3.3.1 → 3.4.2, `nanoid` 5.1.6 → 5.1.11,
`dotenv` 17.3.1 → 17.4.2, `vitest` 4.0.18 → 4.1.5, `vue-tsc` 3.2.x → 3.2.8,
`d3-cloud` 1.2.8 → 1.2.9, `nodemailer` 8.0.1 → 8.0.7.

This is what Renovate's "all non-major" group already automerges. A single
catch-up PR clears the backlog.

### C. Major version jumps — each gets its own PR

| Package                                          | From → To       | Notes                                                                                                            |
| ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `vite`                                           | 6.3.5 → 8.0.11  | Touches frontend, admin, backend SSR, shared. Requires plugin compat audit (`@vitejs/plugin-vue`, mkcert, etc.). |
| `typescript`                                     | 5.9.3 → 6.0.3   | Whole-repo. Run `pnpm type-check` on every package; expect strictness changes.                                   |
| `zod`                                            | 3.25.76 → 4.4.3 | Breaking API. Used by backend + root + zod-prisma-types. Coordinate with `zod-prisma-types` / `prisma-zod-generator` upgrades. |
| `@prisma/client` / `prisma`                      | 6.15 → 7.8      | **Currently pinned to <7 in `renovate.json`.** Decide explicitly whether to lift the pin; v7 is a major.        |
| `prisma-zod-generator`                           | 0.8.13 → 2.1.4  | Two majors — couple with the Prisma + zod decision.                                                              |
| `@types/node`                                    | 22 → 25         | Tied to whether we move backend/CI Node baseline. Keep at 22 LTS unless we bump runtime.                         |
| `i18next`                                        | 25 → 26         | Backend translation pipeline; Tolgee output also affected. Smoke-test ICU formatting + email templates.          |
| `@tolgee/format-icu`, `@tolgee/vue`              | 6 → 7           | Frontend i18n. Pair with `i18next` major and run `pnpm test:i18n`.                                               |
| `@bull-board/api`, `@bull-board/fastify`         | 6 → 7           | Admin queue dashboard.                                                                                           |
| `@fastify/multipart`                             | 9 → 10          | Image/media upload paths — re-test profile photo + audio upload.                                                 |
| `@faker-js/faker`                                | 9 → 10          | Test fixtures only.                                                                                              |
| `bullmq` peers / `ioredis`                       | minor only      | No major — handled in batch B.                                                                                   |
| `bootstrap-vue-next`                             | 0.43 → 0.45     | Pre-1.0; treat every minor as breaking. Visual regression sweep.                                                 |
| `altcha` / `altcha-lib`                          | major           | Captcha — coordinated frontend + backend bump. Test login flow end-to-end.                                       |
| `@openreplay/tracker`                            | 17 → 18         | Frontend telemetry; verify session recording still works.                                                        |
| `undici`                                         | 7 → 8           | Backend HTTP client. Audit fetch/Agent usage.                                                                    |
| `dotenv-expand`                                  | 12 → 13         | Backend + root. Verify `.env.example` still expands.                                                             |
| `@sentry/cli`                                    | 1.77 → 3.4      | Two majors — release upload only; coordinate with deploy scripts.                                                |
| `vite-plugin-mkcert`                             | 1 → 2           | Dev-only; verify `pnpm dev` HTTPS still works.                                                                   |
| `vite-plugin-vue-devtools`                       | 7 → 8           | Dev-only.                                                                                                        |
| `eslint` configs (`@eslint/js` 9 → 10)           | major           | Already on `eslint` 10.x in deps; align config packages.                                                         |
| `serve-static` / `@types/serve-static`           | 1 → 2           | Express ecosystem; check static asset serving in admin/frontend dev.                                             |
| `npm-run-all2`, `nyc`, `c8`, `tsc-watch`         | major           | Tooling-only, low blast radius.                                                                                  |
| `jsdom` / `@types/jsdom` (21 → 28)               | major           | Test env. The `@types/jsdom` jump is huge — verify `vitest` env still works.                                     |
| `rollup-plugin-visualizer`                       | 6 → 7           | Build analysis only.                                                                                             |
| `unplugin-vue-components`                        | 31 → 32         | Frontend auto-imports.                                                                                           |
| `chrome-devtools-mcp`                            | 0.17 → 0.25     | Dev MCP only.                                                                                                    |
| `@lingual/i18n-check`                            | 0.8 → 0.9       | i18n CI step.                                                                                                    |
| `@vue/tsconfig`                                  | 0.8 → 0.9       | Compile config; bundle with the TS 6 PR.                                                                         |

---

## 2. Recommended PR sequence

Each entry below is one PR on its own branch off `main`, with a changeset.

1. **Drop deprecations** — remove `@types/dompurify`, replace `cuid` with
   `@paralleldrive/cuid2`. Migrate any persisted IDs if needed.
2. **Batch B catch-up** — all patch/minor updates in one Renovate-style PR.
   This is the cheapest win and unblocks future majors.
3. **Tooling-only majors** — `turbo`, `npm-run-all2`, `nyc`, `c8`, `tsc-watch`,
   `rollup-plugin-visualizer`, `vite-plugin-mkcert`, `vite-plugin-vue-devtools`,
   `chrome-devtools-mcp`, `@sentry/cli`. No runtime impact; ship together.
4. **TypeScript 6 + `@vue/tsconfig` 0.9 + ESLint config majors.** Whole-repo
   type-check is the gate. Likely surfaces dead code; resist the urge to
   refactor in this PR.
5. **Vite 8 + `@vitejs/plugin-vue` + `unplugin-vue-components` 32 +
   `serve-static` 2.** Build-only; verify dev server, HMR, prod bundles for
   frontend and admin.
6. **`@fastify/multipart` 10 + `undici` 8 + `dotenv-expand` 13.** Backend HTTP
   stack. Re-test upload + outbound HTTP paths.
7. **i18n majors** — `i18next` 26, `@tolgee/format-icu` 7, `@tolgee/vue` 7,
   `@lingual/i18n-check` 0.9. Pair with `pnpm test:i18n` and a Tolgee
   pull/push round-trip.
8. **`@openreplay/tracker` 18, `altcha`/`altcha-lib` major, `@bull-board` 7,
   `@faker-js/faker` 10, `bootstrap-vue-next` 0.45.** Each as its own PR.
9. **`zod` 4** — coordinate with `zod-prisma-types` / `prisma-zod-generator`.
   Generate fresh schema, run full backend tests.
10. **Prisma 7 decision.** Today `renovate.json` pins `<7.0.0`. Either:
    - keep the pin and document why (accept divergence), or
    - lift the pin in a dedicated PR that bumps `prisma`, `@prisma/client`,
      `prisma-zod-generator`, and `zod-prisma-types` together, with a
      migration dry-run against a prod-like DB snapshot.
11. **`@types/node` 25.** Only if we also raise the Node runtime baseline in
    Docker images and CI. Otherwise hold at 22 LTS.

---

## 3. Process notes

- Branch off `main` for each PR; never bundle unrelated bumps (per
  `CLAUDE.md`).
- Every PR ships a changeset (`patch` for batch B, `minor` for behaviour-
  changing majors that don't break our public surface).
- Run `pnpm run ci:test` locally before pushing the major PRs in steps 4–10.
- After steps 5–9, exercise the app manually: login flow, browse, profile
  edit, photo upload, messaging, posts. Type-checks and unit tests do not
  catch all runtime regressions.
- Update `renovate.json`: once the Prisma 7 decision is made, either remove or
  document the pin.
