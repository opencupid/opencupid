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

The captured `BeforeInstallPromptEvent` is stored in a **module-scoped variable** (not in Pinia state), following the same pattern as `useUpdateChecker` which keeps `timeoutId` and `activeCheck` as plain variables. Only a boolean flag goes in the store.

- Module-scoped `let deferredPrompt: BeforeInstallPromptEvent | null`
- `onMounted`: adds `beforeinstallprompt` listener on `window`
  - Calls `event.preventDefault()` to suppress Chrome's default mini-infobar
  - Stores the event in `deferredPrompt`
  - Sets `appStore.canInstallPwa = true`
- `onMounted`: adds `appinstalled` listener on `window`
  - Clears `deferredPrompt` and sets `appStore.canInstallPwa = false`
- `onUnmounted`: removes both listeners
- Exposes `promptInstall()`: calls `.prompt()` on `deferredPrompt`, awaits `userChoice`, then clears the event and sets `canInstallPwa = false` regardless of outcome (accepted or dismissed). If the user dismissed the dialog, the banner stays hidden for the rest of the session; `beforeinstallprompt` may fire again on a subsequent visit.

### 2. Store additions: `appStore.ts`

**File:** `apps/frontend/src/features/app/stores/appStore.ts`

New state:
- `canInstallPwa: false` — boolean flag, toggled by the composable

No event objects in the store. No `localStorage`, no persistence. Dismissal resets on page reload; a fresh `beforeinstallprompt` may fire again on the next visit.

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

`BeforeInstallPromptEvent` is not in the standard lib types. Add a minimal type declaration in `apps/frontend/src/types/pwa.d.ts` covering `prompt()` and `userChoice`.

## What changes

| File | Change |
|------|--------|
| `apps/frontend/src/features/app/composables/usePwaInstall.ts` | New — event capture composable |
| `apps/frontend/src/features/app/components/PwaInstallBanner.vue` | New — banner component |
| `apps/frontend/src/features/app/stores/appStore.ts` | Add `canInstallPwa` boolean state |
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
- When the app is already running as an installed PWA (`display-mode: standalone`), `beforeinstallprompt` does not fire, so the banner naturally never appears

## Acceptance criteria

1. On Android Chrome, when the app is installable, an install banner appears at the top of the page
2. Tapping "Install" triggers Chrome's native install dialog
3. After installation or dialog dismissal, the banner disappears for the rest of the session
4. The close button hides the banner for the remainder of the session
5. The banner does not appear when the app is already installed or when `beforeinstallprompt` does not fire
6. On browsers that don't support `beforeinstallprompt`, no banner is shown (no errors)

## Testing

### Unit tests — composable (`usePwaInstall`)
- Dispatching `beforeinstallprompt` on `window` sets `appStore.canInstallPwa` to true
- Dispatching `appinstalled` sets `appStore.canInstallPwa` to false
- `promptInstall()` calls `.prompt()` on the captured event and clears `canInstallPwa`
- Listeners are cleaned up on unmount

### Unit tests — component (`PwaInstallBanner`)
- Renders when `appStore.canInstallPwa` is true
- Does not render when `canInstallPwa` is false
- Close button hides the banner (dismissed state)
- Install button calls `promptInstall()`
