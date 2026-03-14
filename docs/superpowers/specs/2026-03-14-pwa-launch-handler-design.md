# Route Android magic-link opens into installed PWA window

**Issue:** [#1100](https://github.com/opencupid/opencupid/issues/1100)
**Date:** 2026-03-14
**Status:** Approved

## Problem

When a user taps a magic-link email on Android with the PWA installed, Chrome opens the link in a regular browser tab instead of the installed PWA window. The auth completes in the tab, but the PWA stays untouched.

## Root cause

The web app manifest (`apps/frontend/public/assets/site.webmanifest`) lacks two properties that Chrome needs to route in-scope links to the installed PWA:

- `scope` — defines which URLs belong to the PWA
- `launch_handler` — defines what Chrome should do when an in-scope URL is opened externally

Without these, Chrome has no instruction to prefer the PWA over a regular tab.

## Solution

Add `scope` and `launch_handler` to `site.webmanifest`:

```json
{
  "scope": "/",
  "launch_handler": {
    "client_mode": "navigate-existing"
  }
}
```

### `scope: "/"`

Declares that all URLs under the origin belong to this PWA. The magic link at `/magic-link?token=...` falls within this scope.

### `launch_handler.client_mode: "navigate-existing"`

When an in-scope link is opened externally (e.g., tapped in an email app), Chrome reuses the most recently used PWA window and navigates it to the target URL.

This is the right mode because:

- The `/magic-link` route already processes the token and redirects to `/home` — no additional app-side handling needed
- The user was on a pre-auth screen, so navigating the existing window away is the desired behavior
- Simpler than `focus-existing`, which would require adding `LaunchQueue` API handling in app code

## What changes

| File | Change |
|------|--------|
| `apps/frontend/public/assets/site.webmanifest` | Add `scope` and `launch_handler` properties |

## What does NOT change

- No app code changes (router, components, stores)
- No service worker changes (`sw.js` stays push-only)
- No backend changes (magic link URL format unchanged)

## Browser compatibility

- `launch_handler` is supported in Chrome 110+ on Android and desktop
- On unsupported browsers, the property is ignored — current behavior (open in tab) continues as graceful fallback
- `scope: "/"` is universally supported across all manifest-capable browsers

## Acceptance criteria

1. On Android Chrome with the PWA installed, tapping a magic-link email opens the installed PWA (not a browser tab)
2. The auth flow completes normally inside the PWA window
3. On browsers that don't support `launch_handler`, the existing behavior is preserved (no regression)

## Testing

1. Install the PWA on Android Chrome
2. Log out or use an unauthenticated state
3. Trigger a magic-link email (enter email at `/auth`)
4. Open the email and tap the magic link
5. Verify the PWA window activates and navigates to `/magic-link?token=...`
6. Verify auth completes and the user lands on `/home`
