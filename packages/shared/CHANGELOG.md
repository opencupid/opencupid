# @opencupid/shared

## 0.7.2

### Patch Changes

- a3c2100: Fix correctness gaps in the messaging quarantine state machine: self-view no longer leaks `canMessage=true` / a stale conversationId; mutual matches now promote held PENDING conversations to ACCEPTED and insert the missing recipient participant; and the sender's own held PENDING is now visible to their `canMessage` check. Also drops the top-level `conversation` field from `PublicProfileWithContext` (#1388) — it leaked raw `status: "PENDING"` and duplicated `interactionContext` policy. Refactors `computeSendOutcome` to a status-keyed switch with TS-enforced exhaustiveness.

## 0.7.1

### Patch Changes

- 54177e8: Store `ProfileTrustFlag.evidence` as plain text instead of `Json`. The Json column emitted by #1368 caused zod-prisma-types to ship a runtime `import { Prisma } from '@prisma/client'` in the shared zod barrel, breaking the frontend Vite build. Plain text restores the type-only import; the audit blob shapes were vestigial (single-string contents in two of three reasons; `sampleConversationIds` written but never read).

## 0.7.0

### Minor Changes

- 2d42366: Add profile-trust quarantine: every newly created profile is flagged `PROFILE_UNVETTED` for 24 hours, during which their outbound new conversations are held in a `PENDING` state invisible to the recipient. A 15-minute cron auto-clears the flag and promotes held messages silently. The existing SPAM_BURST heuristic now counts PENDING conversations too; on fire it marks the sender's active (INITIATED+PENDING) conversations `DISCARDED` (terminal). No frontend or API-response changes — the sender cannot distinguish PENDING from INITIATED from their response.
- 96b42f4: Expose profile-trust quarantine in the admin GUI: new Moderation page listing currently-flagged profiles, manual flag/clear flow from the ProfilesPage detail modal, table-warning row indicator for flagged profiles, and a `clearedBy` column on `ProfileTrustFlag` for symmetric audit. Workers leave admin-set flags immune to the 24h auto-clear (filter on `flaggedBy` prefix).

### Patch Changes

- 265f7d2: Silent cookie migration to domain-scoped **session/**refresh cookies ahead of SPA subdomain split. Every authenticated response now sets the new domain-scoped cookie shape (driven by `appConfig.DOMAIN`) and emits a delete for the legacy host-only variant, so active users are migrated in-place without being logged out (#1351)

## 0.6.2

### Patch Changes

- 6443471: Restore end-to-end rate limiting on API routes:
  - Re-register the `./plugins/rate-limiter` plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
  - Return `ApiError`-shaped 429 responses (`{ success: false, message }`) so frontend handlers that narrow on `success === false` recognise them correctly.
  - Route the 429 toast through the `bus` + `AppNotifier` pattern (new `api:rate_limit` event) instead of having the error-classification utility reach for `useToast` directly. The toast copy moves to the translated `uicomponents.error.rate_limit` key (en + hu), and a stable toast id collapses repeat 429s during a burst into a single on-screen notice.

- 0004f5b: Decouple conversation start from message send at the service and route layer. Fixes a latent bug where `markMatchAsSeen` fired on every non-duplicate reply instead of only on true new-conversation sends. Wire response gains an additive `outcome` field (`new_conversation | accepted_on_reply | reply`).

## 0.6.1

### Patch Changes

- 2ea540c: fix(frontend): tighten posts UI and offcanvas widths

## 0.6.0

### Minor Changes

- 46c345b: Add explicit `Brand` metadata on every email payload. Producers stamp brand identity (`siteName`, `frontendUrl`, `domain`) onto each job at enqueue time via a single `currentBrand()` helper, so workers never read process env for branding and can stay brand-blind. Under per-brand-stack deployment each API container's env already matches the user's brand.

  `DOMAIN` is now required (no empty default) in both the shared `AppConfig` schema and the backend's own config schema, so downstream consumers are statically guaranteed a non-empty domain string.

## 0.5.12

### Patch Changes

- 5d4f582: Add post indicator overlay to profiles with collocated posts

## 0.5.11

### Patch Changes

- e004f68: Add Bull Board queue monitoring dashboard, accessible from the admin sidebar at /bull-board

## 0.5.10

### Patch Changes

- bc41c10: Landing page update

## 0.5.9

### Patch Changes

- 6cb091b: Fix tolgee baseline

## 0.5.8

### Patch Changes

- 82f9e6c: Update Hungarian and English translations (#1147)

## 0.5.7

### Patch Changes

- 410d77f: Consolidate opt-in settings defaults and schema derivation (#990)

## 0.5.6

### Patch Changes

- 09d7b58: Implemented several UX fixes in the authentication, registration and onboarding flows.

## 0.5.5

### Patch Changes

- f07d5f0: Fix production build - share vite.common

## 0.5.4

### Patch Changes

- 4d4da9d: Improve email template
- eef5366: Code cleanups - improve robustness and maintainability of the email service
- 81bc4cb: Make User.language non-nullable, update consumer code

## 0.5.3

### Patch Changes

- a58f108: Fix TagCloud exceptions in a newly deployed site

## 0.5.2

### Patch Changes

- a519521: Added opt-in checkboxes to Onboarding wizard sequence

## 0.5.1

### Patch Changes

- 7aca55a: #855 (version display)
