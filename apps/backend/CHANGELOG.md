# backend

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
