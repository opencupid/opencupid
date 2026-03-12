# backend

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
