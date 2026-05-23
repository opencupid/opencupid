# @opencupid/admin

## 0.65.0

## 0.64.0

## 0.63.1

## 0.63.0

### Minor Changes

- a6c8853: Bump Node runtime baseline from 22 to 24. Updates Dockerfile base images,
  GitHub Actions matrices, devcontainer image, `@tsconfig/node22` →
  `@tsconfig/node24`, and `@types/node` to 24.x across the workspace. Held
  back from the latest 25.x line because Node 24 is the current LTS.

### Patch Changes

- a6c8853: Bump patch and minor versions across the monorepo (Renovate-style catch-up):
  vue 3.5.34, vitest 4.1.5, fastify 5.8.5, @sentry/_ 10.52, axios 1.16,
  bullmq 5.76.6, prettier 3.8.3, eslint 10.3.0, typescript-eslint 8.59.2,
  @vueuse/_ 14.3.0, @playwright/test 1.59.1, dompurify 3.4.2, dotenv 17.4.2,
  ioredis 5.10.1, sass 1.99.0, ws 8.20.0, `zod-prisma-types` 3.3.11
  (emits zod-v4 syntax, paired with the zod 4 migration in this stack),
  plus other patch bumps. No major versions.

## 0.62.0

### Minor Changes

- 076f790: Bump Node runtime baseline from 22 to 24. Updates Dockerfile base images,
  GitHub Actions matrices, devcontainer image, `@tsconfig/node22` →
  `@tsconfig/node24`, and `@types/node` to 24.x across the workspace. Held
  back from the latest 25.x line because Node 24 is the current LTS.

### Patch Changes

- e4b5b5f: Bump patch and minor versions across the monorepo (Renovate-style catch-up):
  vue 3.5.34, vitest 4.1.5, fastify 5.8.5, @sentry/_ 10.52, axios 1.16,
  bullmq 5.76.6, prettier 3.8.3, eslint 10.3.0, typescript-eslint 8.59.2,
  @vueuse/_ 14.3.0, @playwright/test 1.59.1, dompurify 3.4.2, dotenv 17.4.2,
  ioredis 5.10.1, sass 1.99.0, ws 8.20.0, plus other patch bumps. No major
  versions; `zod-prisma-types` held at 3.2.4 (3.3.x emits zod-v4 syntax).
  Also drops the unused `@google-cloud/translate` backend dependency.

## 0.61.0

### Minor Changes

- 3db11af: Add dashboard drill-down modal for Interactions and Messages KPIs. Clicking
  the KPI card opens a modal with detailed bar charts (likes / anonymous /
  matches for interactions; messages sent / new conversations for messages)
  across a configurable timeline (24h / 72h / 7d, default 72h), backed by a new
  `/admin/stats/breakdown` endpoint with hourly or daily buckets.

## 0.60.0

### Minor Changes

- b21b661: Redesign admin dashboard with uniform KPI + mini-chart cards. Removes the
  unused Total Users / Total Profiles tiles and folds the standalone Daily
  Signups / Daily Active bar charts into the KPI cards. Adds daily series for
  blocked users and reported profiles to `/admin/stats/daily`.

## 0.59.3

## 0.59.2

### Patch Changes

- 2f1033e: Allow searching admin user list by user ID

## 0.59.1

## 0.59.0

## 0.58.0

### Patch Changes

- 0b900d2: Disable browser auto-translation to prevent crash on Chrome iOS when a Hungarian user landed on the app and Chrome's translator wrapped Vue-rendered text nodes in `<font>` tags, causing Vue's renderer to recurse infinitely.

## 0.57.0

### Minor Changes

- 9f44887: Move welcome message content from i18n into a new `MessageTemplate` database table so site operators can edit it from the admin UI under Messages without a deploy.

## 0.56.0

### Patch Changes

- 897f2a9: Require email at registration; remove phone-only auth path. Migrates existing phone-only users to placeholder emails (`<userId>@phone.migrated.local`).

## 0.55.4

### Patch Changes

- 19eacdd: Block public access to \*.map files via nginx; sourcemaps remain in image for Sentry upload only.

## 0.55.3

## 0.55.2

## 0.55.1

### Patch Changes

- 54177e8: Store `ProfileTrustFlag.evidence` as plain text instead of `Json`. The Json column emitted by #1368 caused zod-prisma-types to ship a runtime `import { Prisma } from '@prisma/client'` in the shared zod barrel, breaking the frontend Vite build. Plain text restores the type-only import; the audit blob shapes were vestigial (single-string contents in two of three reasons; `sampleConversationIds` written but never read).

## 0.55.0

### Minor Changes

- 96b42f4: Expose profile-trust quarantine in the admin GUI: new Moderation page listing currently-flagged profiles, manual flag/clear flow from the ProfilesPage detail modal, table-warning row indicator for flagged profiles, and a `clearedBy` column on `ProfileTrustFlag` for symmetric audit. Workers leave admin-set flags immune to the 24h auto-clear (filter on `flaggedBy` prefix).

## 0.54.0

### Minor Changes

- dbc0427: Admin: bulk in-app message to selected profiles from the Profiles page

## 0.53.4

### Patch Changes

- 377e55b: feat(admin): Daily Active chart + bar charts for interactions/matches/messages
- df4775b: Admin dashboard: replace Daily Logins chart with Daily Active (from `lastSeenAt`); switch Interactions/Matches/Messages to bar charts.

## 0.53.3

## 0.53.2

### Patch Changes

- 8e5e7c0: Expose `User.originDomain` and `User.language` in the admin UI — a new `Origin` column in the users table (last data column, before action buttons) and two new rows (`Language`, `Origin`) in the user detail modal. Backend `/admin/users` list endpoint now returns both fields; `/admin/users/:id` adds `originDomain` (already had `language`).

## 0.53.1

## 0.53.0

## 0.52.1

### Patch Changes

- c73faf7: Add responsive mobile sidebar with offcanvas navigation

## 0.52.0

## 0.51.0

## 0.50.0

## 0.49.0

### Minor Changes

- 86042f7: refactor: replace nginx ingress with Traefik v3 reverse proxy (#1293)
- 5a8c4a2: Add segment and origin filters, infinite scroll, and result count to admin Profiles, Users, and Tags pages (#1261)

## 0.48.0

## 0.47.0

## 0.46.1

## 0.46.0

## 0.45.1

## 0.45.0

### Minor Changes

- e004f68: Add Bull Board queue monitoring dashboard, accessible from the admin sidebar at /bull-board

## 0.44.1

## 0.44.0

### Minor Changes

- b5e2075: Add interaction, match & message line charts to admin dashboard and lastLoginAt column to users table

## 0.43.0

## 0.42.2

## 0.42.1

## 0.42.0

## 0.41.1

## 0.41.0

## 0.40.2

## 0.40.1

## 0.40.0

## 0.39.3

## 0.39.2

## 0.39.1

## 0.39.0

## 0.38.0

## 0.37.0

## 0.36.1

## 0.36.0

## 0.35.2

## 0.35.1

## 0.35.0

## 0.34.0

## 0.33.1

## 0.33.0

## 0.32.1

## 0.32.0

## 0.31.0

## 0.30.0

### Patch Changes

- f3203a7: Fix Docker build by copying patches directory before pnpm install

## 0.29.0

## 0.28.0

## 0.27.0

## 0.26.0

## 0.25.0

## 0.24.0

### Patch Changes

- 5aac8b5: Add dev-inspector-mcp Vite plugin for AI-powered visual debugging in dev mode

## 0.23.1

## 0.23.0

## 0.17.2

### Patch Changes

- f07d5f0: Fix production build - share vite.common

## 0.17.1

### Patch Changes

- 77b43d9: Dev server cleanups
