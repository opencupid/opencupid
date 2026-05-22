# backend

## 0.64.0

### Minor Changes

- b4a6d12: Accept optional `imageIds` on `POST /api/post`, `POST /api/event`, `POST /api/community` and attach those images to the new content atomically. Exports a new `MAX_IMAGES_PER_GALLERY = 6` constant from `@zod/image/image.dto`; the per-kind Create schemas gain optional `imageIds`, and the per-kind Update schemas explicitly omit it.
- 98eab1b: Display user-content images on post/event/community cards and map popups
- 69034af: Drop `ProfileImage.userId` column; images are owned solely by `profileId`. Upload route collapses to a single atomic write that creates the row and syncs `Profile.hasFace` in one transaction.
- f852990: Separate image upload from gallery attach. `POST /image` now returns the
  created image only; gallery membership is managed via the new
  `POST /image/me/attach`, `POST /content/:contentId/image/attach`, and the
  corresponding detach endpoints. `POST /content/:contentId/image` is removed.
- f852990: Generalize image attachments: extract `Image` model from `ProfileImage`, add `UserContentImage` join, and expose `/api/content/:contentId/image/*` endpoints for post/event/community galleries.

## 0.63.1

### Patch Changes

- cc58d31: Fix docker build failing after Prisma 7 upgrade: set placeholder `DATABASE_URL` in builder stage so `prisma.config.ts` resolves at codegen time.

## 0.63.0

### Minor Changes

- a6c8853: Bump Node runtime baseline from 22 to 24. Updates Dockerfile base images,
  GitHub Actions matrices, devcontainer image, `@tsconfig/node22` →
  `@tsconfig/node24`, and `@types/node` to 24.x across the workspace. Held
  back from the latest 25.x line because Node 24 is the current LTS.
- 83f964f: Add a `community` user-content kind with a nullable `yearFounded` attribute. Refactor the cluster point-properties type to reuse the canonical `UserContentKind`, and tighten the polymorphic dispatch sites to exhaustive switches so future kinds fail compilation when unhandled. Also documents the eight-stage process for adding a new user-content type in `docs/user-content-howto.md`.
- a6c8853: Remove unused `prisma-zod-generator` devDependency. The Prisma schema generator block uses `zod-prisma-types` (already at v3); `prisma-zod-generator@0.8.13` was dead weight and pulled in pre-Prisma-7 dependencies incompatible with the new stack.
- a6c8853: Migrate to zod 4 and zod-prisma-types 3.5.x. Update central validation utilities to use `z.flattenError` and `z.treeifyError`. Adjust `z.ZodType` generics to the new 2-arg signature.
- a6c8853: Migrate to Prisma 7 with the `@prisma/adapter-pg` driver adapter and `prisma.config.ts` (datasource URL moved out of `schema.prisma`). `packages/shared` bumps `@prisma/client` to 7.x to keep workspace types consistent.
- 3b17fda: NearbyFeatures shows mixed posts, events, and communities from the viewport in one strip, with per-kind teaser components. /content/posts/bounds is removed; the unified /content/bounds endpoint is the single source.

### Patch Changes

- a6c8853: Bump patch and minor versions across the monorepo (Renovate-style catch-up):
  vue 3.5.34, vitest 4.1.5, fastify 5.8.5, @sentry/_ 10.52, axios 1.16,
  bullmq 5.76.6, prettier 3.8.3, eslint 10.3.0, typescript-eslint 8.59.2,
  @vueuse/_ 14.3.0, @playwright/test 1.59.1, dompurify 3.4.2, dotenv 17.4.2,
  ioredis 5.10.1, sass 1.99.0, ws 8.20.0, `zod-prisma-types` 3.3.11
  (emits zod-v4 syntax, paired with the zod 4 migration in this stack),
  plus other patch bumps. No major versions.
- a6c8853: Bump dev tooling-only major versions: turbo 2.9.10, npm-run-all2 8, nyc 18,
  c8 11, tsc-watch 7, rollup-plugin-visualizer 7, chrome-devtools-mcp 0.25,
  @sentry/cli 3.4, @lingual/i18n-check 0.9. No runtime impact.
- 4b8b057: refactor(messaging): replace promote-pendings queue with state-driven trust-sweep
- 57d08e1: Remove orphaned i18n keys from `packages/shared/i18n/{en,hu}.json` that were no
  longer referenced by any `t()`/`$t()` call in the codebase.
- cb9ce1a: Shrink generated zod schemas: enable `createInputTypes = false` + `useMultipleFiles = true` on `zod-prisma-types`. Drops ~96% of generated LOC (18 155 → 723 lines across 62 small files). No runtime behavior change; 14 type-only imports migrated to deep paths to work around upstream issue #249.
- 59273f0: Fix SPAM_BURST: hold messages instead of destroying them, and scope the threshold to a 24h window. Held messages are now released to recipients when the flag clears, and old unanswered intros no longer count toward the burst threshold.

## 0.62.0

### Minor Changes

- 7b36663: Event-GUI suite: speed-dial create-event entry, unified my-content list (posts + events), event-marker click-through on browse map, venue field, ViewerToolbar with share/copy/attend actions, and calendar export (.ics download + Google Calendar).
- 076f790: Bump Node runtime baseline from 22 to 24. Updates Dockerfile base images,
  GitHub Actions matrices, devcontainer image, `@tsconfig/node22` →
  `@tsconfig/node24`, and `@types/node` to 24.x across the workspace. Held
  back from the latest 25.x line because Node 24 is the current LTS.
- 57b320d: Server-side filtering for the social map's people/posts layers. Adds a `kinds` query parameter to `/find/clusters` and `/find/cluster-leaves`, and replaces the planned client-side layer toggle with a button-group `<MapLayerControl>` that drives a refetch on change.
- 807f8db: UserContent polymorphism via class-table inheritance. Posts move under a unified `/api/content` API; adds Event as a second content kind. (#1445)

### Patch Changes

- 006913b: Fix `Cannot find module 'long'` crash when image processor first loads `@tensorflow/tfjs`. Adds a `pnpm.packageExtensions` entry to inject `long` as a missing dep of `@tensorflow/tfjs@4.22.0`.
- e4b5b5f: Bump patch and minor versions across the monorepo (Renovate-style catch-up):
  vue 3.5.34, vitest 4.1.5, fastify 5.8.5, @sentry/_ 10.52, axios 1.16,
  bullmq 5.76.6, prettier 3.8.3, eslint 10.3.0, typescript-eslint 8.59.2,
  @vueuse/_ 14.3.0, @playwright/test 1.59.1, dompurify 3.4.2, dotenv 17.4.2,
  ioredis 5.10.1, sass 1.99.0, ws 8.20.0, plus other patch bumps. No major
  versions; `zod-prisma-types` held at 3.2.4 (3.3.x emits zod-v4 syntax).
  Also drops the unused `@google-cloud/translate` backend dependency.
- af5ae98: Bump dev tooling-only major versions: turbo 2.9.10, npm-run-all2 8, nyc 18,
  c8 11, tsc-watch 7, rollup-plugin-visualizer 7, chrome-devtools-mcp 0.25,
  @sentry/cli 3.4, @lingual/i18n-check 0.9. No runtime impact.
- cac9a63: Revert UserContent backend abstraction (#1406) and frontend `useUserContentActions` composable (#1407). Wire format unchanged. Clears the way for a class-table-inheritance redesign tracked in `docs/superpowers/specs/2026-05-08-user-content-polymorphism-design.md`.

## 0.61.0

### Minor Changes

- 3db11af: Add dashboard drill-down modal for Interactions and Messages KPIs. Clicking
  the KPI card opens a modal with detailed bar charts (likes / anonymous /
  matches for interactions; messages sent / new conversations for messages)
  across a configurable timeline (24h / 72h / 7d, default 72h), backed by a new
  `/admin/stats/breakdown` endpoint with hourly or daily buckets.
- a401891: Match click in the inbox opens the conversation-detail view instead of the send-message modal, with a redesigned like popover and extracted interaction-context endpoint. See PR description for full details.

## 0.60.0

### Minor Changes

- b21b661: Redesign admin dashboard with uniform KPI + mini-chart cards. Removes the
  unused Total Users / Total Profiles tiles and folds the standalone Daily
  Signups / Daily Active bar charts into the KPI cards. Adds daily series for
  blocked users and reported profiles to `/admin/stats/daily`.
- 47bab10: Extract interaction context from public profile DTO into a dedicated `GET /interactions/context/:targetId` endpoint, owned by `useInteractionStore` on the frontend.

## 0.59.3

### Patch Changes

- 06bd5a1: Fix activity segment misclassification: returning users were being shown as "new" or "dormant" because the `activity-flush` BullMQ queue dedup (jobId=profileId + completed-job retention) silently suppressed re-enqueues well past the 30-minute session window. Replaced the queue + worker with an inline Redis `SET NX EX` debounce in `recordActivity`. The 30-min gap is now TTL-enforced and matches the semantic window. Also removes a per-worker-pickup Postgres `findFirst` that the queue path required.

## 0.59.2

### Patch Changes

- 7389ea1: Fix DISCARDED conversations leaking into inbox/message views; bypass PENDING to INITIATED when a quarantined sender messages a mutually-matched recipient; clear the new-match flag on every engagement send (not just new-conversation creation), so the matches list doesn't keep advertising profiles the user has already messaged.
- 2f1033e: Allow searching admin user list by user ID

## 0.59.1

## 0.59.0

## 0.58.0

### Minor Changes

- a071892: Extract UserContent abstraction layer (Zod base schemas, mapper projections, service interface, and Fastify route factory) so future content types (e.g. Event) can compose with Post on shared infrastructure. No wire-format or behavior changes.

### Patch Changes

- 0d3dc31: Resolve unmet peer-dep warnings: bump zod to 3.25.76 (satisfies the MCP SDK's `^3.25 || ^4.0` peer range) and add a pnpm peerDependencyRule allowing sharp 0.34 for `smartcrop-sharp` (which still pins `^0.32.5` but uses only stable APIs). (#1402)
- c029abf: Delete dead `plugins/auth.ts` file (#1401)

## 0.57.0

### Minor Changes

- bdea6c5: Hide "My turn / Their turn" badges on admin-initiated conversations.
- 9f44887: Move welcome message content from i18n into a new `MessageTemplate` database table so site operators can edit it from the admin UI under Messages without a deploy.

## 0.56.0

### Minor Changes

- d440626: Replace MaxMind with self-hosted observabilitystack/geoip-api for IP-based location lookup. The backend `/location` endpoint now returns lat/lon alongside country (configurable via `GEOIP_API_URL`), and the frontend uses the resolved location to bias Photon geocoder suggestions toward the user's region.
- 897f2a9: Require email at registration; remove phone-only auth path. Migrates existing phone-only users to placeholder emails (`<userId>@phone.migrated.local`).
- 35fbd9d: Add one-click email unsubscribe per RFC 8058. Notification emails now carry a `List-Unsubscribe` / `List-Unsubscribe-Post` header and a footer link to `/unsubscribe/:token?lang=<locale>`. The token is a stateless HMAC of `(userId, emailHash)` with a 2-day TTL, signed with a dedicated `UNSUBSCRIBE_SECRET` so it cannot be reused for authentication. New `User.emailNotificationsOptIn` flag gates all suppressible email types and is exposed as a Settings checkbox; magic-link login emails are always sent and do not include unsubscribe metadata. Closes #1376.

## 0.55.4

### Patch Changes

- 4b867b6: Eagerly migrate the \_\_refresh cookie to the domain-scoped shape on every authenticated request so a planned host migration does not force existing sessions to re-authenticate.
- c15c994: Detect faces on profile image uploads and mirror the primary image's face flag onto the profile.
- 7a23da3: chore(sentry): lower backend tracesSampleRate to 0.05

## 0.55.3

## 0.55.2

### Patch Changes

- a3c2100: Fix correctness gaps in the messaging quarantine state machine: self-view no longer leaks `canMessage=true` / a stale conversationId; mutual matches now promote held PENDING conversations to ACCEPTED and insert the missing recipient participant; and the sender's own held PENDING is now visible to their `canMessage` check. Also drops the top-level `conversation` field from `PublicProfileWithContext` (#1388) — it leaked raw `status: "PENDING"` and duplicated `interactionContext` policy. Refactors `computeSendOutcome` to a status-keyed switch with TS-enforced exhaustiveness.
- afbb490: UX & dev-ergonomics tweaks:
  - Raise like rate limit from 5/min to 25/min so QA scenarios on mutual-match flows aren't throttled.
  - Raise scope-toggle rate limit from 1/day to 5/day so users (and dev/QA) aren't locked out after a single accidental toggle.
  - `PublicProfile.vue`: hide the `<ProfileInteractions>` row (message/like buttons) when the viewer is the target of the profile they're looking at. Belt-and-suspenders frontend guard for the self-view case already gated server-side via `interactionContext`.
  - `publicNameValidation.ts`: lower the minimum public name length from 4 to 3 characters so 3-letter names (e.g. "Joe") are valid.
  - `DatingModeDropdown.vue`: drop the `expanded` toggle class — the grid is now always shown when the dropdown is open, removing a redundant nested expand state.

## 0.55.1

### Patch Changes

- 54177e8: Store `ProfileTrustFlag.evidence` as plain text instead of `Json`. The Json column emitted by #1368 caused zod-prisma-types to ship a runtime `import { Prisma } from '@prisma/client'` in the shared zod barrel, breaking the frontend Vite build. Plain text restores the type-only import; the audit blob shapes were vestigial (single-string contents in two of three reasons; `sampleConversationIds` written but never read).

## 0.55.0

### Minor Changes

- 2d42366: Add profile-trust quarantine: every newly created profile is flagged `PROFILE_UNVETTED` for 24 hours, during which their outbound new conversations are held in a `PENDING` state invisible to the recipient. A 15-minute cron auto-clears the flag and promotes held messages silently. The existing SPAM_BURST heuristic now counts PENDING conversations too; on fire it marks the sender's active (INITIATED+PENDING) conversations `DISCARDED` (terminal). No frontend or API-response changes — the sender cannot distinguish PENDING from INITIATED from their response.
- 2add4d3: Admin bulk-send: append to existing INITIATED conversations and broadcast to recipients via WebSocket (#1377)
- 96b42f4: Expose profile-trust quarantine in the admin GUI: new Moderation page listing currently-flagged profiles, manual flag/clear flow from the ProfilesPage detail modal, table-warning row indicator for flagged profiles, and a `clearedBy` column on `ProfileTrustFlag` for symmetric audit. Workers leave admin-set flags immune to the 24h auto-clear (filter on `flaggedBy` prefix).

### Patch Changes

- 265f7d2: Silent cookie migration to domain-scoped **session/**refresh cookies ahead of SPA subdomain split. Every authenticated response now sets the new domain-scoped cookie shape (driven by `appConfig.DOMAIN`) and emits a delete for the legacy host-only variant, so active users are migrated in-place without being logged out (#1351)

## 0.54.0

### Minor Changes

- dbc0427: Admin: bulk in-app message to selected profiles from the Profiles page

### Patch Changes

- a0eb6f0: Inbox: drop status-based grouping, order conversations by updatedAt only (#1363)
- 1ad1387: Migrate deprecated `package.json#prisma` block to `prisma.config.ts` ahead of Prisma 7.
- 6443471: Restore end-to-end rate limiting on API routes:
  - Re-register the `./plugins/rate-limiter` plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
  - Return `ApiError`-shaped 429 responses (`{ success: false, message }`) so frontend handlers that narrow on `success === false` recognise them correctly.
  - Route the 429 toast through the `bus` + `AppNotifier` pattern (new `api:rate_limit` event) instead of having the error-classification utility reach for `useToast` directly. The toast copy moves to the translated `uicomponents.error.rate_limit` key (en + hu), and a stable toast id collapses repeat 429s during a burst into a single on-screen notice.

- 0004f5b: Decouple conversation start from message send at the service and route layer. Fixes a latent bug where `markMatchAsSeen` fired on every non-duplicate reply instead of only on true new-conversation sends. Wire response gains an additive `outcome` field (`new_conversation | accepted_on_reply | reply`).

## 0.53.4

### Patch Changes

- 377e55b: feat(admin): Daily Active chart + bar charts for interactions/matches/messages
- df4775b: Admin dashboard: replace Daily Logins chart with Daily Active (from `lastSeenAt`); switch Interactions/Matches/Messages to bar charts.
- 595f6f2: Stop issuing magic-link login tokens for users with `User.isBlocked = true`. Previously `isBlocked` had no effect on the auth path — blocked users could still request and redeem login links.

## 0.53.3

## 0.53.2

### Patch Changes

- 8e5e7c0: Expose `User.originDomain` and `User.language` in the admin UI — a new `Origin` column in the users table (last data column, before action buttons) and two new rows (`Language`, `Origin`) in the user detail modal. Backend `/admin/users` list endpoint now returns both fields; `/admin/users/:id` adds `originDomain` (already had `language`).

## 0.53.1

### Patch Changes

- 942bcfb: Stamp `__o` cookie in the `/refresh` handler so users with pre-existing active sessions get their home-brand marker backfilled without having to log out and back in (#1340).

## 0.53.0

### Minor Changes

- f623e04: Record `User.originDomain` at registration. Every new user now captures the hostname they hit when signing up (normalized to lowercase, port stripped). Existing rows are backfilled to the deploy's `DOMAIN` env via a three-step migration (add nullable → backfill → set NOT NULL). No runtime consumer yet; this is data collection for future per-user brand features.

  **Deploy note**: the backfill SQL in `20260420000000_add_user_origin_domain/migration.sql` currently uses the literal `'example.org'`. Substitute with the target environment's `DOMAIN` env before running `prisma migrate deploy` in staging/production.

- f1a5c24: Split backend into dedicated API and worker containers. Workers are no longer instantiated as import side effects inside API replicas; repeatable/cron jobs register exactly once from a single `worker.ts` entrypoint, bull-board moves to the worker container on port 3100, and a shared ioredis connection replaces four ad-hoc ones. Traefik's admin router is split accordingly so `/api` stays on the backend while `/bull-board` points at the worker.
- e10a372: Detect cross-brand login attempts: when the email matches an existing user whose `originDomain` differs from the serving brand, set an `__o` cookie with the user's origin domain and rewrite the magic-link URL to target that origin.
- 46c345b: Add explicit `Brand` metadata on every email payload. Producers stamp brand identity (`siteName`, `frontendUrl`, `domain`) onto each job at enqueue time via a single `currentBrand()` helper, so workers never read process env for branding and can stay brand-blind. Under per-brand-stack deployment each API container's env already matches the user's brand.

  `DOMAIN` is now required (no empty default) in both the shared `AppConfig` schema and the backend's own config schema, so downstream consumers are statically guaranteed a non-empty domain string.

### Patch Changes

- fb932d2: Break cross-brand login redirect loop by making \_\_o cookie stamping authoritative on both /send-magic-link and /verify-token, and removing the direct-redirect bypass for /auth and /magic-link in the frontend inline redirect script.
- e3a269e: Evict cluster cache after updateSession succeeds in PATCH /scopes (#1329)
- 3dd6b85: Evict cluster cache when dating scope is toggled so the map reflects the new active state.

## 0.52.1

### Patch Changes

- 5d4f582: Add post indicator overlay to profiles with collocated posts

## 0.52.0

### Minor Changes

- b098972: NearbyFeatures strip now fetches posts directly from `/posts/bounds` so clustered posts are no longer hidden from the panel. The `/posts/bounds` response shape changed from `PublicPostWithProfile[]` to the lighter `PostSummary[]` (matches what the strip needs; no existing production consumer relied on the richer shape).

### Patch Changes

- da72eaf: Fix face-aware autocrop missing faces on full-body portraits: swap BlazeFace (selfie-tuned short-range, 128×128 input) for MediaPipe FaceDetector full-range (192×192, trained on wider scenes), raise smartcrop boost weight so small faces outscore saturated/high-detail regions, and stop sharp's attention strategy from re-cropping over smartcrop's output.

## 0.51.0

## 0.50.0

### Minor Changes

- d396a27: Scope new_message email notification dedup per sender→recipient pair

### Patch Changes

- 9785b27: Evict cluster cache when posts are created, updated, or deleted (#1309)

## 0.49.0

### Minor Changes

- a98fa75: Add /search endpoint: parallel search across tags, profiles, posts, and locations. Profile and post text use pg_trgm GIN indexes (language-agnostic substring match via ILIKE + similarity ranking) — adding a new app locale requires no database changes.
- 86042f7: refactor: replace nginx ingress with Traefik v3 reverse proxy (#1293)
- 9f954f2: ContactFormPanel: show waiting-for-reply state when user already initiated contact (#1279)
- 377e74b: Retire the persistent SocialMatchFilter model in favour of ephemeral, client-side browse filtering. Tag selection now lives in a session-only Pinia store and is passed to bounds/cluster queries via a `?tagIds=` query param. The location input becomes a flyTo-only control that no longer filters results. The legacy `GET/PATCH /find/social/filter` endpoints remain as deprecated no-op shims so stale frontends keep working until all clients are updated.
- 21778ac: Search omnibox in the browse pill: a single input that searches in parallel across tags, profiles, posts, and geocoded locations. Selecting a result navigates to the detail panel and flies the map to the picked location.
  - Frontend: extracts SearchInput / SearchResults / ProfileChipList; geocoding is biased to the viewer's country and capped at 5 candidates; type-safe Bootstrap-Vue-Next variant augmentation (incl. a `post-it` color for post chips).
  - Backend: `PostSummary` and `ProfileSummary` now carry `location: LocationDTO` so the client can fly the map to a result; `extractLocation` shared across mappers.

- b12ebbc: Unify map browse endpoints into single clustered response with mixed profile+post clustering (#1284)

### Patch Changes

- 8ed1c79: Fix activity segment misclassifying single-visit users as 'returning'
- d847866: Clean up tsconfig files: fix TS 5.9 deprecations, remove redundant config, fix Docker build (#1283)
- efc2c9d: Remove deprecated endpoint shims and dead code, rename browse endpoints (#1294)
- c4a0175: Architectural cleanup: DRY up BoundsQuerySchema, move osmPoiMap into features/map, consolidate browse composables into single view-model
- de7c7a6: Evict cluster cache when blocking a profile (#1292)
- 5dc7947: Add B-tree indexes on lat/lon columns for Profile and Post, remove dead BrowseService and findSocialProfilesInBounds
- a362cc1: Relax SMTP_USER config validation to accept non-email usernames (#1299)
- a4abe34: Align PostService and ClusterService with module-level prisma import pattern, simplify PostService.update(), remove erroneous findNearby OR fallback (#1285, #1286)
- a3dd928: Fix profile image variant cutting off faces by replacing hand-rolled crop
  geometry with smartcrop-sharp content-aware cropping and BlazeFace face boosts

## 0.48.0

## 0.47.0

### Minor Changes

- 34c0da4: Add server-side map clustering with supercluster for browse profiles map

### Patch Changes

- d90d4d6: Fix infinite image upload retry loop caused by ERR_BAD_RESPONSE being treated as a network error, and tolerate minor JPEG spec violations in Sharp image processing
- 911516e: Disable welcome email

## 0.46.1

### Patch Changes

- 26f4289: Make onboarding reminder time window configurable via job data (`windowOffsetMs`); remove backfill script

## 0.46.0

### Minor Changes

- 1362392: Add daily onboarding reminder email for users who registered 3 days ago but haven't completed their profile

### Patch Changes

- 48db9e1: Consolidate i18n: merge api/ email strings into root locale files, add ICU support to backend (#994)

## 0.45.1

## 0.45.0

### Minor Changes

- e004f68: Add Bull Board queue monitoring dashboard, accessible from the admin sidebar at /bull-board
- 3d95b93: Replace Redis-debounced per-request activity writes with a BullMQ flush worker that gap-checks against Postgres directly, fixing FK violations caused by stale sessions for deleted users

### Patch Changes

- 5cb0c05: Fix auth session logout bugs (#1231 follow-up)
  - scope logout to current session only — remove tokenVersion bump that was invalidating all other active sessions across devices
  - reset bootstrap singleton on auth:logout so a re-login in the same app lifetime re-fetches the profile
  - replace hard redirect (window.location.href) on refresh failure with bus-driven router navigation to eliminate race with Vue lifecycle

## 0.44.1

## 0.44.0

### Minor Changes

- b5e2075: Add interaction, match & message line charts to admin dashboard and lastLoginAt column to users table

### Patch Changes

- d1d0c5c: Replace Redis/Lua media auth with nginx-jwt-module for JWT signature verification on /user-content/ requests; fix post-onboarding 401 caused by session deletion on profile activation; fix refresh request 415 error caused by missing Content-Type header

## 0.43.0

### Minor Changes

- 405fb4f: Replace HMAC media auth with Redis session checking; migrate JWT from localStorage to cookie

## 0.42.2

## 0.42.1

## 0.42.0

### Patch Changes

- cd91e13: Add JSDoc documentation to all API route endpoints and clarify interaction mapper naming
- ed5f223: Clean up .env.example: hardcode constants, reorder, add secret generation script (#912)
- aa771a3: Clean up postStore: add Zod response validation, StoreResponse pattern, deduplicate query params, fix post visibility toggle (#1216)

## 0.41.1

## 0.41.0

## 0.40.2

### Patch Changes

- c5c5113: Extend JWT and session TTL to 30 days so users stay logged in for a month (#1203)

## 0.40.1

## 0.40.0

### Patch Changes

- e7b520e: Fix empty tag names when previewing profile in an unsupported locale (#1191)

## 0.39.3

## 0.39.2

## 0.39.1

## 0.39.0

## 0.38.0

## 0.37.0

## 0.36.1

## 0.36.0

### Minor Changes

- dc597ed: Refactor push notifications: extract utility to lib/utils, move subscription logic to dedicated Pinia store, derive checkbox state from browser permissions, add DELETE /push/subscription endpoint with rate limiting, auto-cleanup stale 410 subscriptions (#push-refactor)

## 0.35.2

## 0.35.1

## 0.35.0

## 0.34.0

## 0.33.1

## 0.33.0

### Patch Changes

- e10b8f5: Unify MessageDTO mapper input types into single `mapMessageToDTO` function (#1096)

## 0.32.1

## 0.32.0

## 0.31.0

## 0.30.0

### Patch Changes

- f3203a7: Fix Docker build by copying patches directory before pnpm install

## 0.29.0

### Minor Changes

- 1d2286e: Signed cookie media auth — replaces per-URL HMAC query params with a single `__media_token` cookie (#1089)

### Patch Changes

- 956853f: Extract dating wizard and prefs into standalone routed views (#1096)
- 9e21523: Fix dating preferences not persisted during onboarding and dating wizard flows (#1094)

## 0.28.0

## 0.27.0

## 0.26.0

### Minor Changes

- dfb52c4: Add anonymous like flag and received likes interaction UX (#1077)

### Patch Changes

- 68b5c54: New matches logic: isNew filter, dating profile modal, session hasActiveProfile sync (#1064)
- 8b9a770: Fix hasKids/prefKids preference labels, match logic, and layout overflow on small screens
- 24365e5: Consolidate duplicated app locale maps into shared registry, fix language name fallback to English
- 01d60b1: Auto-accept conversation when matched profiles send first message

## 0.25.0

### Minor Changes

- 1b4494b: Dev-only OTP bypass: render a "Continue" button on the magic-link page that auto-fetches and verifies the latest token, skipping Mailpit

## 0.24.0

### Patch Changes

- da2cf1a: Remove debug console.log/console.debug statements and dead commented-out code

## 0.23.1

## 0.23.0

### Minor Changes

- 431affb: Automate end-to-end release workflow, adopt fixed versioning across all app packages (#1041)

### Patch Changes

- d62a7a2: Derive map center from profile location and remove "Anywhere" fallback for lonely-country profiles (#1045)
- 2599d97: Extract userStore from authStore and clean up PATCH /users/me to language-only with Zod validation (#997, #982)

## 0.19.0

### Minor Changes

- c99e129: Add geo-boundary filtering for map-based profile browsing (#1032)
- d03c461: Remove smartcrop-sharp dependency, simplify image processing pipeline to use sharp.strategy.attention as fallback

### Patch Changes

- 43e1199: Fix reprocess-images script to compute and persist blurhash for existing images, fix tensor memory leak and zero-rect fallback in ImageProcessor
- 9687f24: Minor cleanup
- c239914: Remove find-up dependency, replace with plain Node.js directory walk (#1033)
- 8fb9ef1: Fix rendering of POI items on the map

## 0.18.0

### Minor Changes

- 31516c3: Token-only auth verification: magic links now work across browser contexts (#1017)
- edf5250: Posts UI improvements

## 0.17.13

### Patch Changes

- 4a3ca99: Remove unnecessary fallback values from SITE_NAME constants where defaults are already guaranteed by strong typing.
- 9f26c2f: FIx email compatibility issues
- 09d7b58: Implemented several UX fixes in the authentication, registration and onboarding flows.

## 0.17.12

### Patch Changes

- fb36113: Add release automation, tighten PR checks

## 0.17.10

### Patch Changes

- 4d4da9d: Improve email template
- eef5366: Code cleanups - improve robustness and maintainability of the email service
- 81bc4cb: Make User.language non-nullable, update consumer code

## 0.17.9

### Patch Changes

- a58f108: Fix TagCloud exceptions in a newly deployed site
- 782ec3d: Add Dockerfile environment variables to suppress pnpm/prisma update notifications during image builds.

## 0.17.8

### Patch Changes

- 0549505: Fixed interest tag seed dump, Prisma seed and .json files to import cleanly.

## 0.17.7

### Patch Changes

- 3a519a1: Added initial set of interest tags

## 0.17.6

### Patch Changes

- a519521: Added opt-in checkboxes to Onboarding wizard sequence

## 0.17.5

### Patch Changes

- 0e19851: fix(deployment): Finalize deployment scripts

## 0.17.4

### Patch Changes

- b81a2e4: Implement production/staging deployment tools (#908)

## 0.17.3

### Patch Changes

- 1d5d8b9: Fix version endpoint returning "latest" instead of real frontend semver (#882)

## 0.17.2

### Patch Changes

- 618ae1a: Remove own profile filter
- d81bb63: Fix invalid OTP returning 401 (now 422) and improve OTP input UX (#870)

## 0.17.2

### Patch Changes

- 7aca55a: #855 (version display)

## 0.6.2

### Minor Changes

- Minor fixes, updates and chores.

## 0.6.1

### Patch Changes

- Dependency updates

## 0.6.0

### Minor Changes

- Introducing map view

## 0.5.1

### Patch Changes

- 35ec87e: Initial release
- 2418b9f: Dependency updates
