# @opencupid/shared

## 0.13.0

### Minor Changes

- e9b9851: Search now includes events and communities alongside posts, surfaced as separate sections in the omnibox.

## 0.12.0

### Minor Changes

- d366047: Add ContentImageButton to post/event/community edit dialogs. Images can now be uploaded during create (staged locally, attached on save) and during edit (immediate attach). Abandoned uploads are GC'd best-effort on dialog close. Adds `userContent.image_button.{label,modal_title}` i18n keys to `@opencupid/shared` (en + hu).
- b4a6d12: Accept optional `imageIds` on `POST /api/post`, `POST /api/event`, `POST /api/community` and attach those images to the new content atomically. Exports a new `MAX_IMAGES_PER_GALLERY = 6` constant from `@zod/image/image.dto`; the per-kind Create schemas gain optional `imageIds`, and the per-kind Update schemas explicitly omit it.
- 98eab1b: Display user-content images on post/event/community cards and map popups
- f852990: Generalize image attachments: extract `Image` model from `ProfileImage`, add `UserContentImage` join, and expose `/api/content/:contentId/image/*` endpoints for post/event/community galleries.

### Patch Changes

- cf5af26: Translation updates
- 69034af: Drop `ProfileImage.userId` column; images are owned solely by `profileId`. Upload route collapses to a single atomic write that creates the row and syncs `Profile.hasFace` in one transaction.

## 0.11.0

### Minor Changes

- 83f964f: Add a `community` user-content kind with a nullable `yearFounded` attribute. Refactor the cluster point-properties type to reuse the canonical `UserContentKind`, and tighten the polymorphic dispatch sites to exhaustive switches so future kinds fail compilation when unhandled. Also documents the eight-stage process for adding a new user-content type in `docs/user-content-howto.md`.
- a6c8853: Migrate to zod 4 and zod-prisma-types 3.5.x. Update central validation utilities to use `z.flattenError` and `z.treeifyError`. Adjust `z.ZodType` generics to the new 2-arg signature.
- a6c8853: Migrate to Prisma 7 with the `@prisma/adapter-pg` driver adapter and `prisma.config.ts` (datasource URL moved out of `schema.prisma`). `packages/shared` bumps `@prisma/client` to 7.x to keep workspace types consistent.

### Patch Changes

- 6415c7f: GUI iteration on top of the Community feature (#1454):
  - Tonal accent-color system (theme.scss): new `--bs-event` and `--bs-community` semantic tokens with formula-derived `-light` variants. Community map marker restyled to a colored circle with the embracing-figures icon.
  - MapLayerControl: 2x2 grid with per-kind semantic outline colors (outline-event, outline-community, outline-post-it).
  - Speed-dial refactored with @floating-ui/vue: placement auto-adapts to viewport room (opens upward by default, downward when there's no room above), repositions on scroll/resize. SpeedDial and UserContentCreateSpeedDial extracted as reusable components; the latter exposes triggerClass/actionClass props for re-skinning per call site.
  - Owner-drawer toolbar gains the create speed-dial alongside the Inbox and Profile buttons.
  - After any post/event/community CRUD, the BrowseProfiles map invalidates its cluster cache and refetches via a new `usercontent:mutated` bus event.
  - Hungarian translations for the community.\* i18n namespace (#1456).

- cb9ce1a: Shrink generated zod schemas: enable `createInputTypes = false` + `useMultipleFiles = true` on `zod-prisma-types`. Drops ~96% of generated LOC (18 155 → 723 lines across 62 small files). No runtime behavior change; 14 type-only imports migrated to deep paths to work around upstream issue #249.

## 0.10.0

### Minor Changes

- 7b36663: Event-GUI suite: speed-dial create-event entry, unified my-content list (posts + events), event-marker click-through on browse map, venue field, ViewerToolbar with share/copy/attend actions, and calendar export (.ics download + Google Calendar).
- 57b320d: Server-side filtering for the social map's people/posts layers. Adds a `kinds` query parameter to `/find/clusters` and `/find/cluster-leaves`, and replaces the planned client-side layer toggle with a button-group `<MapLayerControl>` that drives a refetch on change.
- 807f8db: UserContent polymorphism via class-table inheritance. Posts move under a unified `/api/content` API; adds Event as a second content kind. (#1445)

## 0.9.3

### Patch Changes

- a401891: Match click in the inbox opens the conversation-detail view instead of the send-message modal, with a redesigned like popover and extracted interaction-context endpoint. See PR description for full details.

## 0.9.2

### Patch Changes

- ab92ac2: Redesign the like popover with a button-pair anonymous/revealed toggle, add a "you smiled at X" confirmation toast, and split tracking into create/update/like-back events.

## 0.9.1

### Patch Changes

- 27b17ef: Rebrand the "like" feature as "smile" in user-facing copy (HU + EN). Heart icon swapped for smiling-emoji.svg in InteractionButtons. Like feature behavior is unchanged.

## 0.9.0

### Minor Changes

- a071892: Extract UserContent abstraction layer (Zod base schemas, mapper projections, service interface, and Fastify route factory) so future content types (e.g. Event) can compose with Post on shared infrastructure. No wire-format or behavior changes.

## 0.8.1

### Patch Changes

- bdea6c5: Hide "My turn / Their turn" badges on admin-initiated conversations.

## 0.8.0

### Minor Changes

- 897f2a9: Require email at registration; remove phone-only auth path. Migrates existing phone-only users to placeholder emails (`<userId>@phone.migrated.local`).

### Patch Changes

- 35fbd9d: Add one-click email unsubscribe per RFC 8058. Notification emails now carry a `List-Unsubscribe` / `List-Unsubscribe-Post` header and a footer link to `/unsubscribe/:token?lang=<locale>`. The token is a stateless HMAC of `(userId, emailHash)` with a 2-day TTL, signed with a dedicated `UNSUBSCRIBE_SECRET` so it cannot be reused for authentication. New `User.emailNotificationsOptIn` flag gates all suppressible email types and is exposed as a Settings checkbox; magic-link login emails are always sent and do not include unsubscribe metadata. Closes #1376.

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
