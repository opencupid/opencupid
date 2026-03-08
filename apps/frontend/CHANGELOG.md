# frontend

## 0.21.0

### Minor Changes

- 4f58ff4: Posts UI improvements

### Patch Changes

- cd096b3: Move appConfig schema to shared/zod, simplify runtime config plugin (#1010)
- 1b94fcf: Fix OTP form flash on magic link redirect (#1013)

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
