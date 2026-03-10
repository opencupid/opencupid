# frontend

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
