# frontend

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
