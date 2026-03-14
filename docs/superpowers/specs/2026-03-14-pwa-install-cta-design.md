# PWA Install CTA Banner

**Issue:** [#1100](https://github.com/opencupid/opencupid/issues/1100) (part 2 — install prompt)
**Date:** 2026-03-14
**Status:** Approved

## Problem

When a user visits the app in Android Chrome, there is no in-app affordance to install the PWA. Users must discover Chrome's "Add to Home Screen" menu item on their own.

## Solution

Implement an in-app install banner that appears when Chrome determines the app is installable. The banner uses the `beforeinstallprompt` browser event to trigger Chrome's native install dialog.

The implementation mirrors the existing `UpdateBanner` + `useUpdateChecker` pattern exactly.

### Key constraint

The browser fully controls when `beforeinstallprompt` fires. The app cannot force the install dialog. The UI is therefore opportunistic: the banner only appears when the event has been captured, and is otherwise absent.

## Architecture

### 1. Composable: `usePwaInstall.ts`

**File:** `apps/frontend/src/features/app/composables/usePwaInstall.ts`

- `onMounted`: adds `beforeinstallprompt` listener on `window`
  - Calls `event.preventDefault()` to suppress Chrome's default mini-infobar
  - Stores the event in `appStore.pwaInstallEvent`
- `onMounted`: adds `appinstalled` listener on `window`
  - Clears `appStore.pwaInstallEvent` (hides the banner)
- `onUnmounted`: removes both listeners
- Exposes `promptInstall()`: calls `.prompt()` on the stored event, awaits `userChoice`, clears the event from store regardless of outcome

### 2. Store additions: `appStore.ts`

**File:** `apps/frontend/src/features/app/stores/appStore.ts`

New state:
- `pwaInstallEvent: BeforeInstallPromptEvent | null` — the captured event (session-scoped, no persistence)

New getter:
- `canInstallPwa` — returns `pwaInstallEvent !== null`

No `localStorage`, no persistence. Dismissal resets on page reload; a fresh `beforeinstallprompt` may fire again on the next visit.

### 3. Banner component: `PwaInstallBanner.vue`

**File:** `apps/frontend/src/features/app/components/PwaInstallBanner.vue`

- Renders when `appStore.canInstallPwa && !dismissed`
- "Install" button calls `promptInstall()` from the composable
- Close button sets local `dismissed = ref(true)` (session-scoped, same pattern as `UpdateBanner`)
- Same sticky-top alert styling as `UpdateBanner`
- Uses i18n keys for all user-facing strings

### 4. Wiring in `App.vue`

**File:** `apps/frontend/src/App.vue`

- Import and call `usePwaInstall()` alongside `useUpdateChecker()`
- Add `<PwaInstallBanner />` next to `<UpdateBanner />`

### 5. i18n keys

**File:** `packages/shared/i18n/en.json`

Add under `uicomponents`:
```json
"install_banner": {
  "message": "Install this app on your device.",
  "install": "Install"
}
```

### 6. TypeScript

`BeforeInstallPromptEvent` is not in the standard lib types. Add a minimal type declaration (inline in the composable or in a `.d.ts`) covering `prompt()` and `userChoice`.

## What changes

| File | Change |
|------|--------|
| `apps/frontend/src/features/app/composables/usePwaInstall.ts` | New — event capture composable |
| `apps/frontend/src/features/app/components/PwaInstallBanner.vue` | New — banner component |
| `apps/frontend/src/features/app/stores/appStore.ts` | Add `pwaInstallEvent` state and `canInstallPwa` getter |
| `apps/frontend/src/App.vue` | Wire composable + banner |
| `packages/shared/i18n/en.json` | Add install banner i18n keys |
| Tests for composable and component | New |

## What does NOT change

- No backend changes
- No service worker changes
- No manifest changes (already handled by the launch_handler work)
- No changes to the existing `UpdateBanner` or `useUpdateChecker`

## Browser compatibility

- `beforeinstallprompt` is supported in Chromium-based browsers (Chrome, Edge, Samsung Internet)
- Safari and Firefox do not fire this event — the banner simply never appears (graceful degradation)
- The `appinstalled` event is supported in Chrome 64+

## Acceptance criteria

1. On Android Chrome, when the app is installable, an install banner appears at the top of the page
2. Tapping "Install" triggers Chrome's native install dialog
3. After installation (or dialog dismissal), the banner disappears
4. The close button hides the banner for the remainder of the session
5. The banner does not appear when the app is already installed or when `beforeinstallprompt` does not fire
6. On browsers that don't support `beforeinstallprompt`, no banner is shown (no errors)

## Testing

### Unit tests — composable (`usePwaInstall`)
- Dispatching `beforeinstallprompt` on `window` stores the event and sets `canInstallPwa` to true
- Dispatching `appinstalled` clears the event and sets `canInstallPwa` to false
- `promptInstall()` calls `.prompt()` on the stored event
- Listeners are cleaned up on unmount

### Unit tests — component (`PwaInstallBanner`)
- Renders when `appStore.canInstallPwa` is true
- Does not render when `canInstallPwa` is false
- Close button hides the banner (dismissed state)
- Install button calls `promptInstall()`
