---
'@opencupid/frontend': patch
---

Fix sidebar leak over onboarding view and retire the posts sidebar. The PostsSidebar teleport into AuthLayout's shared slot was surviving KeepAlive deactivation in AppShell, bleeding stale DOM onto the Onboarding route during the fresh-login redirect hop. Removes PostsSidebar entirely and restores the pre-refactor dual-hook (onMounted + onActivated) onboarding guard in BrowseProfiles so keep-alive re-entry is handled.
