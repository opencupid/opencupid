# Design: Extract OptInCheckboxes Component (#916)

**Date:** 2026-03-03

## Context

The three opt-in checkboxes in `Settings.vue` (push notifications, callable, newsletter) are self-contained enough to be extracted into a shared `OptInCheckboxes` component. Once extracted, the component can be reused on the onboarding finish screen.

## Current State

`apps/frontend/src/features/settings/views/Settings.vue` contains:
- `PushPermissions` component usage (already extracted)
- Inline callable checkbox + `handleCallableChange()` handler
- Inline newsletter checkbox + `handleNewsletterOptInChange()` handler
- Shared `isSaving` ref used by both inline handlers

## Design

### New component: `OptInCheckboxes.vue`

**Location:** `apps/frontend/src/features/settings/components/OptInCheckboxes.vue`

**Responsibilities:**
- Own the save logic for callable and newsletter checkboxes (extracted from Settings.vue)
- Use `PushPermissions` internally for the push notification checkbox
- Manage its own `isSaving` ref
- Fetch initial values directly from `useOwnerProfileStore()` and `useAuthStore()`

**Props:**
- `disabled?: boolean` — forwarded to all inputs while saving

**No emits needed** — all persistence is internal via stores.

**PushPermissions binding:**
`OptInCheckboxes` reads `authStore.user.isPushNotificationEnabled` and passes it as `v-model` to `<PushPermissions>`. `PushPermissions.vue` is not changed.

### Modified: `Settings.vue`

Replace:
- The `<fieldset>` containing `<PushPermissions v-model="..." />`
- The `<fieldset>` containing the callable checkbox
- The `<fieldset>` containing the newsletter checkbox
- `handleCallableChange()`, `handleNewsletterOptInChange()` functions
- `isSaving` ref (if it becomes unused)

With: `<OptInCheckboxes />`

The `user` reactive object in Settings.vue no longer needs `isPushNotificationEnabled` for this purpose, but it is still needed for display of email/phone.

### Modified: `Onboarding.vue`

Add `<OptInCheckboxes />` to the finish screen (inside the `v-else` block, after the confirmation title/icon area and before the CTA buttons). This allows new users to configure their notification/call/newsletter preferences immediately after onboarding.

### Tests

- `apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts` — new test file
  - Mock `ownerProfileStore` and `authStore`
  - Test callable checkbox: toggles store and calls `persistOwnerProfile`; reverts on failure
  - Test newsletter checkbox: calls `authStore.updateUser`; reverts on failure
  - Test `disabled` prop forwarded to inputs
- Existing `PushPermissions.spec.ts` — no changes needed
- Existing `Settings.vue` tests (if any) — update if needed

## Files Changed

| File | Change |
|---|---|
| `apps/frontend/src/features/settings/components/OptInCheckboxes.vue` | **new** |
| `apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts` | **new** |
| `apps/frontend/src/features/settings/views/Settings.vue` | replace inline checkboxes with `<OptInCheckboxes />` |
| `apps/frontend/src/features/onboarding/views/Onboarding.vue` | add `<OptInCheckboxes />` to finish screen |

## Acceptance Criteria

- `OptInCheckboxes` is self-contained; no save logic remains in `Settings.vue` for these fields
- Settings page renders identically to today
- Onboarding finish screen displays the three checkboxes and saves correctly
- Existing tests pass; new tests added for `OptInCheckboxes`
