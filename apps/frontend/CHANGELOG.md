# frontend

## 0.60.0

### Minor Changes

- ab92ac2: Redesign the like popover with a button-pair anonymous/revealed toggle, add a "you smiled at X" confirmation toast, and split tracking into create/update/like-back events.
- 47bab10: Extract interaction context from public profile DTO into a dedicated `GET /interactions/context/:targetId` endpoint, owned by `useInteractionStore` on the frontend.

## 0.59.3

### Patch Changes

- f1b3480: Replace Umami init polling with a load-event promise so identify/track calls before the script loads are queued reliably and silently dropped on script load failure rather than hanging.

## 0.59.2

### Patch Changes

- 27b17ef: Rebrand the "like" feature as "smile" in user-facing copy (HU + EN). Heart icon swapped for smiling-emoji.svg in InteractionButtons. Like feature behavior is unchanged.
- 7792f81: Always mount the BrowseProfiles map, falling back to a default centroid when the viewer profile lacks coordinates (#1420)

## 0.59.1

### Patch Changes

- cbbda28: Allow the cross-domain bouncer script in index.html under CSP via a sha256 hash in script-src.

## 0.59.0

### Minor Changes

- a5061b7: Extract Sentry init into `lib/sentry.ts` and instrument empty geocoder results with `Sentry.captureMessage`.
- 61bfd37: Add Umami event tracking for onboarding wizard steps, login email submission, and search bar to capture richer engagement data.

### Patch Changes

- 16dbfa3: Tighten Settings view layout: remove empty fieldset placeholders, swap legend for h6, tighten responsive margins, smaller form-hint typography.
- 1292a46: Hide scrollbar on MyProfile component scroll container
- b23675d: Restore CSP and other security headers on SPA-served paths. nginx's per-location `add_header` was suppressing the server-level stack on every HTML response.

## 0.58.0

### Minor Changes

- ee1f1d2: The browse map now zooms in when a location is picked from the search bar, or when a post is clicked in the NearbyFeatures strip below the map.
- cf3a624: Extract `useUserContentActions` composable and refactor `postStore` to setup syntax. Generic CRUD/fetch action set is now reusable for future content stores (e.g. Event). All public store property and action names preserved — no consumer changes.

### Patch Changes

- c23bdfe: Smoother browse map on pan/zoom and marker hover, plus fix `api:offline` firing spuriously when in-flight popup/cluster fetches were aborted.
- 0b900d2: Disable browser auto-translation to prevent crash on Chrome iOS when a Hungarian user landed on the app and Chrome's translator wrapped Vue-rendered text nodes in `<font>` tags, causing Vue's renderer to recurse infinitely.

## 0.57.0

### Minor Changes

- bdea6c5: Hide "My turn / Their turn" badges on admin-initiated conversations.
- e5847c6: Add Umami analytics

## 0.56.0

### Minor Changes

- d440626: Replace MaxMind with self-hosted observabilitystack/geoip-api for IP-based location lookup. The backend `/location` endpoint now returns lat/lon alongside country (configurable via `GEOIP_API_URL`), and the frontend uses the resolved location to bias Photon geocoder suggestions toward the user's region.
- 897f2a9: Require email at registration; remove phone-only auth path. Migrates existing phone-only users to placeholder emails (`<userId>@phone.migrated.local`).
- 35fbd9d: Add one-click email unsubscribe per RFC 8058. Notification emails now carry a `List-Unsubscribe` / `List-Unsubscribe-Post` header and a footer link to `/unsubscribe/:token?lang=<locale>`. The token is a stateless HMAC of `(userId, emailHash)` with a 2-day TTL, signed with a dedicated `UNSUBSCRIBE_SECRET` so it cannot be reused for authentication. New `User.emailNotificationsOptIn` flag gates all suppressible email types and is exposed as a Settings checkbox; magic-link login emails are always sent and do not include unsubscribe metadata. Closes #1376.

## 0.55.4

### Patch Changes

- 19eacdd: Block public access to \*.map files via nginx; sourcemaps remain in image for Sentry upload only.
- 7988b8f: Use `ref()` instead of `reactive()` for v-model bindings in onboarding view to silence `@vue/compiler-sfc` warnings (#583)

## 0.55.3

### Patch Changes

- e5e2eb0: Include `apps/frontend/package.json` in the nginx runtime image so CI can read the shipped version directly from the image.

## 0.55.2

### Patch Changes

- a3c2100: Fix correctness gaps in the messaging quarantine state machine: self-view no longer leaks `canMessage=true` / a stale conversationId; mutual matches now promote held PENDING conversations to ACCEPTED and insert the missing recipient participant; and the sender's own held PENDING is now visible to their `canMessage` check. Also drops the top-level `conversation` field from `PublicProfileWithContext` (#1388) — it leaked raw `status: "PENDING"` and duplicated `interactionContext` policy. Refactors `computeSendOutcome` to a status-keyed switch with TS-enforced exhaustiveness.
- 0e0bcc9: Remove 26 orphaned Vue components from apps/frontend/src/features (and their co-located tests/stubs).
- afbb490: UX & dev-ergonomics tweaks:
  - Raise like rate limit from 5/min to 25/min so QA scenarios on mutual-match flows aren't throttled.
  - Raise scope-toggle rate limit from 1/day to 5/day so users (and dev/QA) aren't locked out after a single accidental toggle.
  - `PublicProfile.vue`: hide the `<ProfileInteractions>` row (message/like buttons) when the viewer is the target of the profile they're looking at. Belt-and-suspenders frontend guard for the self-view case already gated server-side via `interactionContext`.
  - `publicNameValidation.ts`: lower the minimum public name length from 4 to 3 characters so 3-letter names (e.g. "Joe") are valid.
  - `DatingModeDropdown.vue`: drop the `expanded` toggle class — the grid is now always shown when the dropdown is open, removing a redundant nested expand state.

## 0.55.1

## 0.55.0

### Patch Changes

- 92769e1: Fix "Take Photo" button opening the gallery instead of the camera in Firefox/Android (#234). The image upload input now uses MIME-type values in `accept` so the `capture` attribute is honored across browsers.
- bd1b660: Bump @sentry/vue to 10.50.0, disable Replay session sampling on iOS-affected routes, revert OsmPoiMap sentry-block band-aid (#1373)
- 265f7d2: Silent cookie migration to domain-scoped **session/**refresh cookies ahead of SPA subdomain split. Every authenticated response now sets the new domain-scoped cookie shape (driven by `appConfig.DOMAIN`) and emits a delete for the legacy host-only variant, so active users are migrated in-place without being logged out (#1351)

## 0.54.0

### Patch Changes

- 6443471: Restore end-to-end rate limiting on API routes:
  - Re-register the `./plugins/rate-limiter` plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
  - Return `ApiError`-shaped 429 responses (`{ success: false, message }`) so frontend handlers that narrow on `success === false` recognise them correctly.
  - Route the 429 toast through the `bus` + `AppNotifier` pattern (new `api:rate_limit` event) instead of having the error-classification utility reach for `useToast` directly. The toast copy moves to the translated `uicomponents.error.rate_limit` key (en + hu), and a stable toast id collapses repeat 429s during a burst into a single on-screen notice.

- ce4fac0: Fix initiator's own profile appearing in their own match list after a like-back, and stale "received like" entry lingering after the like becomes mutual.

## 0.53.4

## 0.53.3

### Patch Changes

- 44e9f6e: chore(frontend): update map-bg.png asset
- 927e102: feat(frontend): move OG tags + brand labels to landing /pages/

## 0.53.2

### Patch Changes

- 831ba7a: Remove inline Vue landing page. The public landing at `/` now lives in the separate `opencupid/landingpages` repo and is served by Traefik to anonymous visitors; authenticated visitors skip it and go straight to the SPA.
- 2ea540c: fix(frontend): tighten posts UI and offcanvas widths

## 0.53.1

## 0.53.0

### Patch Changes

- fb932d2: Break cross-brand login redirect loop by making \_\_o cookie stamping authoritative on both /send-magic-link and /verify-token, and removing the direct-redirect bypass for /auth and /magic-link in the frontend inline redirect script.
- 82cc2c3: Tag frontend Sentry events with `frontend_origin` set to `__APP_CONFIG__.DOMAIN`, so dashboards/alerts are brand-attributable without URL parsing.
- ea34fd3: Inline script in `index.html` reads the `__o` cookie and redirects to `/_migrate?to=<path>` when the user's origin brand hostname differs from the currently served hostname. Skips mid-auth flows (`/auth`, `/magic-link`, `/_migrate`). Runs before the Vue bundle loads to avoid races and uses `location.replace` so the redirected URL does not become a back-button entry.
- 7c0e11a: fix(frontend): adjust ShareDialog shadow and disable autofocus
- 71d17e0: Unblock frontend Docker build: give `DOMAIN` in the shared appConfig schema a `'localhost'` default so build-time parsing (where runtime env isn't exposed) no longer fails. Runtime `DOMAIN` is still injected by `envsubst` at container start from `.env`, and the backend continues to enforce a non-empty `DOMAIN` via its own schema. Updates the corresponding unit test and removes the now-redundant `DOMAIN: "ci.local"` workaround from the CI workflow.
- 1e5287b: Hide title and hint when email magic-link token error is shown (#1337)

## 0.52.1

### Patch Changes

- 5d4f582: Add post indicator overlay to profiles with collocated posts

## 0.52.0

### Minor Changes

- b098972: NearbyFeatures strip now fetches posts directly from `/posts/bounds` so clustered posts are no longer hidden from the panel. The `/posts/bounds` response shape changed from `PublicPostWithProfile[]` to the lighter `PostSummary[]` (matches what the strip needs; no existing production consumer relied on the richer shape).

## 0.51.0

### Minor Changes

- edc0027: Add NearbyFeatures panel on browse map — a bottom offcanvas showing nearby posts from the current map viewport as post-it teaser cards. Supports horizontal wheel-to-scroll in collapsed state and a wrap-grid layout when expanded. (#1315)

### Patch Changes

- 3563a73: Tighten MapPoi.id and related map-layer types from `string | number` to `string`, removing redundant coercions.
- 507130d: Fix transient focus-outline artifact on BOffcanvas panels (NearbyFeatures, DetailPanelOrchestrator). BootstrapVueNext auto-focused the panel root on open, painting a 2px focus-visible outline above the panel edge until the first state change moved focus away. Passing `:focus="false"` opts out of the auto-focus for these persistent/secondary panels where the ring isn't needed.

## 0.50.0

### Minor Changes

- ba3507b: Add relative timestamp to message bubbles (#1307)

### Patch Changes

- dab0675: Decrease font size of message-sent confirmation text (#1306)

## 0.49.0

### Minor Changes

- aa26b35: Route-driven shell with unified detail panel orchestration: named Me/Browse/Inbox/Conversation routes replace query-param redirects, panel lifecycle centralizes in DetailPanelOrchestrator, browse map renders PostFullView for posts and clamps flyToMarker to MAP_MAX_ZOOM (#1265)
- 86042f7: refactor: replace nginx ingress with Traefik v3 reverse proxy (#1293)
- e04618d: Replace SwipeModal with custom BottomSheet component using BOffcanvas + useSwipe
- 9f954f2: ContactFormPanel: show waiting-for-reply state when user already initiated contact (#1279)
- 0c1cb89: Search & profile panel UI polish: fix scroll chain in MyProfile drawer, restructure SearchBar with outside-click dismiss, robust touch detection for map markers, and various layout improvements
- 377e74b: Retire the persistent SocialMatchFilter model in favour of ephemeral, client-side browse filtering. Tag selection now lives in a session-only Pinia store and is passed to bounds/cluster queries via a `?tagIds=` query param. The location input becomes a flyTo-only control that no longer filters results. The legacy `GET/PATCH /find/social/filter` endpoints remain as deprecated no-op shims so stale frontends keep working until all clients are updated.
- 21778ac: Search omnibox in the browse pill: a single input that searches in parallel across tags, profiles, posts, and geocoded locations. Selecting a result navigates to the detail panel and flies the map to the picked location.
  - Frontend: extracts SearchInput / SearchResults / ProfileChipList; geocoding is biased to the viewer's country and capped at 5 candidates; type-safe Bootstrap-Vue-Next variant augmentation (incl. a `post-it` color for post chips).
  - Backend: `PostSummary` and `ProfileSummary` now carry `location: LocationDTO` so the client can fly the map to a result; `extractLocation` shared across mappers.

- b12ebbc: Unify map browse endpoints into single clustered response with mixed profile+post clustering (#1284)
- f1b71af: Auth page visual polish: glassmorphism login dialog, map background, responsive logo, and extract shared AuthLayout component

### Patch Changes

- e46b4ab: Fix map popup click not reaching profile navigation handler
- d5e2c47: Fix panel layout spacing in DatingPrefs, EditPostDialog, and Settings views
- d847866: Clean up tsconfig files: fix TS 5.9 deprecations, remove redundant config, fix Docker build (#1283)
- 127c36e: Extract ContactFormPanel to encapsulate the "initial contact" send-message + success-state UX previously duplicated across PostCard, SendMessageDialog, and MatchPopup
- 02a46a0: Initialize map directly at user's location instead of world view + flyTo, avoiding double tile load on cold start
- a789c67: UI polish: fix OwnerDrawer specificity/breakpoint so responsive widths apply, clip x-overflow on SwipeModal panel so PostIt drop-shadow no longer leaks a horizontal scrollbar, vertically center Settings form with `safe center`, fix DatingModeDropdown BPopover writeback that re-opened the popover on collapse, teleport-disable the fullscreen image modal so it paints above SwipeModal's top layer, deterministic teardown of PostCard's inline send-message state
- f156bf4: Remove dead profileList pipeline and fix double bootstrap in BrowseProfiles
- acbceaf: Fix Sentry Replay stack overflow on iOS by excluding Leaflet map from DOM serialization (#1281)
- efc2c9d: Remove deprecated endpoint shims and dead code, rename browse endpoints (#1294)
- b7c15c0: Fix mobile error overlay flash on tab switch by adding visibility-aware offline detection
- 64b56d4: Browse: replace lonely-alert with shared ShareDialog offcanvas (#1300)
- ac27d7f: Fix stale map/filter state after onboarding completion (#1267). Moves `/onboarding` out of `AuthLayout`'s children and into its own top-level `OnboardingLayout` sibling, so navigating between onboarding and the main app causes the other layout to unmount — destroying any cached `AppShell` state (`<KeepAlive>`) from a pre-redirect mount. Previously, a freshly-registered user's transient `BrowseProfiles` mount would cache `matchFilter=null` and an uninitialized map centered on `[0,0]`, and that broken state was preserved through the onboarding wizard via `<KeepAlive>`, leaving the filter bar blank and the map stuck at world zoom on return.
- c4a0175: Architectural cleanup: DRY up BoundsQuerySchema, move osmPoiMap into features/map, consolidate browse composables into single view-model
- 7a5acd5: Fix sidebar leak over onboarding view and retire the posts sidebar. The PostsSidebar teleport into AuthLayout's shared slot was surviving KeepAlive deactivation in AppShell, bleeding stale DOM onto the Onboarding route during the fresh-login redirect hop. Removes PostsSidebar entirely and restores the pre-refactor dual-hook (onMounted + onActivated) onboarding guard in BrowseProfiles so keep-alive re-entry is handled.
- 5e52956: Update i18n translation files with new keys and sorted entries

## 0.48.0

### Minor Changes

- 6ba95f9: Add diagnostic checkpoint events at key onboarding flow stages via Sentry/GlitchTip

## 0.47.0

### Minor Changes

- 2200a56: Integrate OpenReplay session replay tracker with optional OPENREPLAY_PROJECT_KEY and OPENREPLAY_INGEST_POINT config vars
- 34c0da4: Add server-side map clustering with supercluster for browse profiles map

### Patch Changes

- d90d4d6: Fix infinite image upload retry loop caused by ERR_BAD_RESPONSE being treated as a network error, and tolerate minor JPEG spec violations in Sharp image processing

## 0.46.1

### Patch Changes

- 2190b30: Fix RecordFetchError when loading Hungarian locale on stale cached bundles (#1247)

## 0.46.0

### Patch Changes

- a2acd2d: Disambiguate kids form labels and dating profile tab title (#1246)

## 0.45.1

### Patch Changes

- bb845d3: Restore Rubik Variable font with Latin Extended-A charset; fixes Hungarian Ő/ő/Ű/ű rendering (#1242)
- 9a64ef3: Widen message bubbles and fix paragraph spacing in MessageList (#1241)

## 0.45.0

### Patch Changes

- 5cb0c05: Fix auth session logout bugs (#1231 follow-up)
  - scope logout to current session only — remove tokenVersion bump that was invalidating all other active sessions across devices
  - reset bootstrap singleton on auth:logout so a re-login in the same app lifetime re-fetches the profile
  - replace hard redirect (window.location.href) on refresh failure with bus-driven router navigation to eliminate race with Vue lifecycle

## 0.44.1

### Patch Changes

- bc41c10: Landing page update

## 0.44.0

### Patch Changes

- d1d0c5c: Replace Redis/Lua media auth with nginx-jwt-module for JWT signature verification on /user-content/ requests; fix post-onboarding 401 caused by session deletion on profile activation; fix refresh request 415 error caused by missing Content-Type header

## 0.43.0

### Minor Changes

- 405fb4f: Replace HMAC media auth with Redis session checking; migrate JWT from localStorage to cookie

## 0.42.2

### Patch Changes

- d630b58: Fix image carousel nav buttons closing fullscreen modal and eliminate open-flicker on non-zero slide

## 0.42.1

## 0.42.0

### Minor Changes

- aa771a3: Clean up postStore: add Zod response validation, StoreResponse pattern, deduplicate query params, fix post visibility toggle (#1216)

### Patch Changes

- b6ff61c: Fix i18n for time-ago rendering in PostCard (#1204)
- af127a2: Fix offcanvas close-animation flash by replacing BOffcanvas with native Bootstrap Offcanvas JS

## 0.41.1

### Patch Changes

- e490dac: fix: Fetch conversation data on mount

## 0.41.0

### Minor Changes

- ba4e4b3: Fine tune translated strings

### Patch Changes

- d7f0582: Show common languages between sender and recipient in SendMessageForm
- fbe8641: Update @vueuse/core, @vueuse/components, and @vueuse/integrations from 13.5.0 to 14.2.1

## 0.40.2

## 0.40.1

### Patch Changes

- 706abf0: Simplify layout system: add container-content class, remove FluidColumn, widen Navbar, eliminate repeated main boilerplate (#1199)

## 0.40.0

### Minor Changes

- 5671563: Extract IntrotextLanguageChooser component and sort languages by current GUI locale

### Patch Changes

- 6aacc26: Fix language labels rendering in English instead of GUI locale on first mount
- 186042e: Remove explicit envsubst variable list so new config vars no longer need manual sync (#1181)
- 64ccee5: Fix TagSelector so parent can override the taggable prop via attrs

## 0.39.3

### Patch Changes

- 54ff24d: Replace MAPTILER_API_KEY with MAP_TILE_URL — configure the full tile URL (including API key) in .env instead of assembling it in code
- 57f36f0: Fix spiderfied post-it map markers not opening post modal (#1183)

## 0.39.2

### Patch Changes

- 4b5059b: Fix location search dropdown not showing results due to GEOCODING_ALLOWED_COUNTRIES and FRONTEND_URL not being substituted in docker-entrypoint.sh
- c47e3f3: fix: migrate map tiles from deprecated HERE legacy API to HERE Maps v3 (#1182)

## 0.39.1

### Patch Changes

- 63e0917: Gate DevAutoLogin component on DEV_AUTH_BYPASS_ENABLED runtime flag to prevent 404s when the backend bypass endpoint is not enabled
- f3bbb0b: Fix modal backdrop to render as light/frosted-white instead of dark (#1162)
- a2795a2: Fix redirect to /onboarding being skipped after fresh registration due to two races: fire-and-forget auth:login event and KeepAlive skipping onMounted

## 0.39.0

### Minor Changes

- 5b651d2: Replace map pin with mini post-it marker on /posts map, fix per-instance icon cache collision between posts and profiles map (#1174)

### Patch Changes

- c82187c: feat: clean up ShareDialog — inline URL as code element, single-row layout, QR code full width, vertical centering
- b2d67f9: feat: move posts view mode toggle to floating pill, freeing filter bar space
- d3d9185: perf: inline fonts as base64 data URIs in CSS bundle to eliminate font swap substitution

## 0.38.0

### Minor Changes

- dbca451: Tag selector dropdown: elevation shadow when active, tag cloud dims while dropdown is open
- 1428077: Add configurable country allowlist for geocoding search results (#1155)
- 09eb088: IntrotextEditor: show full language name and flag icon in language tabs, with a help popover (#1160)

### Patch Changes

- 8b87f9a: Remove orphaned dating_mode_view_hint_inactive i18n key reference from ViewAsDropdown
- 139b18e: fix: open ShareDialog fallback when Web Share API is blocked in Edge (#1161)
- 884ef10: fix: sort exact geocoding matches first and cancel stale requests (#1157)

## 0.37.0

### Minor Changes

- d44e9c3: Add PWA launch_handler to route Android magic-link taps into installed app, and add in-app install banner using beforeinstallprompt (#1100)
- 2c344ba: Browse empty state: inline CTA with native share (#1153)

### Patch Changes

- 248eb94: Re-render map results when matchFilter changes on BrowseProfiles activation (#1152)
- a5ba79e: Sync i18n JSON files to Tolgee export baseline (key reordering, remove empty footer placeholders)
- c3b93b4: Hide language chooser in IntrotextEditor when user has only one language
- c9fc246: Refresh conversation list when a profile is blocked from any view (#1150)
- 2c32ef3: Refactor PublicProfile: lift store ownership to view, simplify component to pure presenter (#refactor)

## 0.36.1

### Patch Changes

- 4b8ca61: Invalidate bounds cache when filter is updated

## 0.36.0

### Minor Changes

- dc597ed: Refactor push notifications: extract utility to lib/utils, move subscription logic to dedicated Pinia store, derive checkbox state from browser permissions, add DELETE /push/subscription endpoint with rate limiting, auto-cleanup stale 410 subscriptions (#push-refactor)
- bd123b7: Show received non-anonymous likes with profile thumbnails, extract like card components (#1145)
- 32c61eb: Fix mobile cluster tap opening popup instead of zooming, increase map icon sizes 25%, cap maxZoom at 12, style popup close button (#1141)

### Patch Changes

- 275054d: Debounce offline detection to prevent false-positive error overlay on app-switch

## 0.35.2

### Patch Changes

- 1c24aeb: Shuffle UserHome profile grid ordering per session for variety

## 0.35.1

### Patch Changes

- 8554ef5: Fix landing page not being scrollable on any viewport
- 8215025: Fix font substitution for Hungarian ő/ű characters by importing full unicode-range font subsets

## 0.35.0

### Minor Changes

- f6b1419: Optimize production bundle: fix NODE_ENV for Vite builds, async Sentry, lazy flag-icons, devtools leak fix (#1134)

## 0.34.0

### Minor Changes

- 0f08f23: Optimize OsmPoiMap performance: diff-based marker updates, debounced bounds emission, parallel API fetches, icon caching, and expanding-bounds cache

## 0.33.1

### Patch Changes

- bbad7c6: Fix TypeError crash when profileImages is undefined in ImageCarousel (#1131)

## 0.33.0

### Minor Changes

- 7bfe60a: Replace vector tiles with raster-only map layer and style attribution overlay
- 14d6529: Extract TagFilterSelector component and fix map double-render on tag filter change (#1129)

### Patch Changes

- c2c9939: Simplify messageStore by extracting helpers, unifying send methods, and using $reset() (#1124)
- f305f0e: fix: eliminate duplicate API calls in dating preferences and messaging views
- 8942422: Fix ghost-click popup on touch spiderfy of map clusters
- 3b74a21: Prevent Leaflet flyTo NaN crash when map container has zero dimensions (#1125)
- 0e8ea9b: UX fixes: hide carousel nav for single images, close fullscreen on click, fix settings layout wrapping, fix default scope in edit mode

## 0.32.1

### Patch Changes

- 6803aac: Fix Vue errors not being captured by Sentry due to errorHandler race condition

## 0.32.0

### Minor Changes

- ebcb3ee: Refactor geocoding: extract provider abstraction, add Nominatim support

### Patch Changes

- c7c0cdd: Extract OsmPoiMap pure utility functions into testable mapUtils module, move component into osmPoiMap/ subdirectory, and fix Invalid LatLng (NaN, NaN) crash

## 0.31.0

### Minor Changes

- aa839bc: Extract ConversationView into standalone route (#messaging-extract)
- 5434faf: Responsive navbar layout: bottom tab bar on mobile, top navbar on desktop (#1107)
- 1f8f079: Add splash screen with logo and gradient background for improved first paint experience

### Patch Changes

- bb77996: Misc UI tweaks: fix dating prefs scrollable layout, scope watcher, dropdown auto-close, IntrotextEditor hard-reload bug, and DatingEligibleProfileSchema null birthday validation (#1115)
- 89c3cda: Skip redundant PATCH /users/me language sync on hard reload
- 1427660: Messaging UI cleanup: extract SendModeSelector and EmptyView components, remove unused i18n key

## 0.30.0

### Minor Changes

- 1af0822: Generalize map marker icons via iconComponent prop, add post map pin icons, remove geolocation code from posts

### Patch Changes

- dda231a: Pull vite-plugin-vue-mcp from fork with MCP transport fixes
- f3203a7: Fix Docker build by copying patches directory before pnpm install
- f7e7bc1: Add favicon notification dot using Tinycon (#1103)

## 0.29.0

### Minor Changes

- 956853f: Extract dating wizard and prefs into standalone routed views (#1096)

### Patch Changes

- 9e21523: Fix dating preferences not persisted during onboarding and dating wizard flows (#1094)

## 0.28.0

### Minor Changes

- c551cf4: Responsive UserHome layout with dynamic TagCloud sizing (#1088)
- 8feb0cd: Dating wizard intro overlay, nav consistency fix, and i18n extraction (#1087)

## 0.27.0

### Minor Changes

- ecc179d: Dating prefs dialog: disable preferences link until onboarded, add birth year i18n display (#1082)

## 0.26.0

### Minor Changes

- dfb52c4: Add anonymous like flag and received likes interaction UX (#1077)
- 68b5c54: New matches logic: isNew filter, dating profile modal, session hasActiveProfile sync (#1064)
- d04192b: Refactor MyProfile secondary nav: extract ViewAsDropdown and DatingModeDropdown components, add dating prefs refresh on update

### Patch Changes

- 8b9a770: Fix hasKids/prefKids preference labels, match logic, and layout overflow on small screens
- 86a1145: Pin VueUse to 13.x to fix WebSocket not connecting after async bootstrap
- d9122e9: Fix language preview dropdown not showing when user speaks languages the app UI isn't translated into
- 1352d33: Suppress message toast notifications while Messaging view is open (#1079)
- 8ed85f1: Fix inbox empty state overlay showing on top of received likes teaser
- 24365e5: Consolidate duplicated app locale maps into shared registry, fix language name fallback to English

## 0.25.0

### Minor Changes

- 363a514: Extract ProfileChipList component, add ReceivedLikesTeaser, and improve messaging view layout (#1061)
- b40ff65: Add vue-mcp integration for live Vue component/store debugging via MCP
- 1b4494b: Dev-only OTP bypass: render a "Continue" button on the magic-link page that auto-fetches and verifies the latest token, skipping Mailpit

### Patch Changes

- 321b82c: Fix avatar click inside spiderfied map clusters not opening popup (#1061)

## 0.24.0

### Minor Changes

- fec9d54: Improve map clustering UX: fix spider interaction, popup stability, hover effects, staggered marker rendering, and KeepAlive for browse view

### Patch Changes

- e1bd8b7: Fix visual inconsistencies in browse filter bar multiselect components (#1059)
- da2cf1a: Remove debug console.log/console.debug statements and dead commented-out code
- 5aac8b5: Add dev-inspector-mcp Vite plugin for AI-powered visual debugging in dev mode

## 0.23.1

### Patch Changes

- 410d77f: Consolidate opt-in settings defaults and schema derivation (#990)
- 739c442: Remove unused files: dead icon scripts, orphan stores/services, and relocate stray logo asset (#1056)

## 0.23.0

### Minor Changes

- 2599d97: Extract userStore from authStore and clean up PATCH /users/me to language-only with Zod validation (#997, #982)

### Patch Changes

- d62a7a2: Derive map center from profile location and remove "Anywhere" fallback for lonely-country profiles (#1045)
- 0fafc9b: Show an interest tag cloud during onboarding
- fd0b0b5: Fix `this._map is null` crash in MaptilerLayer after map destroy (#1035, #1026)
- f5159a2: Fix LocationSelector dropdown rendering behind Leaflet zoom controls (#1049)
- 74d134f: Fix multiselect dropdown clipping inside modals (#1039)
- 4f56456: Defer map:ready until tiles render to keep placeholder visible during load (#1046)
- e779c66: Fix missing viewerProfile injection on public profile hard refresh (#1048)

## 0.22.0

### Minor Changes

- c99e129: Add geo-boundary filtering for map-based profile browsing (#1032)

### Patch Changes

- 37a9cd0: Fix blurhash placeholder not rendering in ImageCarousel (#1029)
- 8fb9ef1: Fix rendering of POI items on the map

## 0.21.0

### Minor Changes

- 31516c3: Token-only auth verification: magic links now work across browser contexts (#1017)
- edf5250: Posts UI improvements

### Patch Changes

- b08f77a: Fix duplicated spinners in Settings
- cd096b3: Move appConfig schema to shared/zod, simplify runtime config plugin (#1010)
- 1b94fcf: Fix OTP form flash on magic link redirect (#1013)
- 29c053b: Add layer filter to Photon geocoding API to prevent country-only results in LocationSelector (#1019)

## 0.20.0

### Minor Changes

- cc8252c: Integrate Tolgee in-context editing via vue-i18n compatibility shim (#971)

### Patch Changes

- c60b4f2: Fix auth ID input field not accepting user input due to conflicting v-model and :value bindings (#969)
- 4a3ca99: Remove unnecessary fallback values from SITE_NAME constants where defaults are already guaranteed by strong typing.
- 09d7b58: Implemented several UX fixes in the authentication, registration and onboarding flows.

## 0.19.10

### Patch Changes

- fb36113: Add release automation, tighten PR checks

## 0.19.9

### Patch Changes

- 665d437: Implement validation on publicName in onboarding
- 997cf21: Fixed some tech debt in translation infra

## 0.19.8

### Patch Changes

- f07d5f0: Fix production build - share vite.common

## 0.19.7

### Patch Changes

- 4d4da9d: Improve email template
- 45581f3: Fix hardcoded sentry tracePropagationTargets option
- 77b43d9: Dev server cleanups

## 0.19.6

### Patch Changes

- a58f108: Fix TagCloud exceptions in a newly deployed site
- 782ec3d: Add Dockerfile environment variables to suppress pnpm/prisma update notifications during image builds.

## 0.19.5

### Patch Changes

- 99802bd: Fix LocationSelector close-on-select behavior and map zoom persistence (#878)

## 0.19.4

### Patch Changes

- 87bedb9: Refactor update detection and API offline detection
- a519521: Added opt-in checkboxes to Onboarding wizard sequence

## 0.19.3

### Patch Changes

- 903e180: Minor refactoring
- f83a371: Replace maildev with mailpit for local email capture

## 0.19.2

### Patch Changes

- 3624003: Fix frontend not recovering from ApiError after docker compose pull + up (#880)

  Root cause: nginx cached the old container IP at startup; after container hot-swap the IP changed and nginx returned 502 indefinitely. Added Docker's embedded DNS resolver (`127.0.0.11 valid=10s`) and switched all `proxy_pass` directives to use variables so nginx re-resolves service hostnames after container replacement.

  Secondary fix: WebSocket now reconnects automatically when `api:online` fires (previously autoReconnect gave up after 3 retries and was never re-attempted).

## 0.19.1

### Patch Changes

- 7fc8f03: Fix CI docker build
- 7904623: Improve accessibility of map clusters (#881)

## 0.19.0

### Minor Changes

- bc3e49e: Fix OG tags baked at build time — substitute them at container startup via envsubst (#885)

## 0.18.0

### Minor Changes

- b537c96: Add PNG raster tile fallback for OsmPoiMap when WebGL is unavailable (#872)

### Patch Changes

- 18b25c7: Fix flaky authStore test: bump @vitest/coverage-v8 to match vitest@4.0.18, add afterAll cleanup for module-scope stubs in test files, and restore api adapter and window.location in api-refresh tests (#856)
- d81bb63: Fix invalid OTP returning 401 (now 422) and improve OTP input UX (#870)
- c7b4ee3: Pre-populate TagSelector dropdown with viewer's profile tags as initial suggestions (#862)

## 0.17.2

### Patch Changes

- 7aca55a: 841/#843 (browse/map fixes)
- 7aca55a: #855 (version display)

## 0.17.1

### Patch Changes

- 1c20615: WS ticket refresh fix

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
