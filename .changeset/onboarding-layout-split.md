---
'@opencupid/frontend': patch
---

Fix stale map/filter state after onboarding completion (#1267). Moves `/onboarding` out of `AuthLayout`'s children and into its own top-level `OnboardingLayout` sibling, so navigating between onboarding and the main app causes the other layout to unmount — destroying any cached `AppShell` state (`<KeepAlive>`) from a pre-redirect mount. Previously, a freshly-registered user's transient `BrowseProfiles` mount would cache `matchFilter=null` and an uninitialized map centered on `[0,0]`, and that broken state was preserved through the onboarding wizard via `<KeepAlive>`, leaving the filter bar blank and the map stuck at world zoom on return.
