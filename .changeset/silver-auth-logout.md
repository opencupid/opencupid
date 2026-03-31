---
'@opencupid/frontend': patch
'@opencupid/backend': patch
---

Fix auth session logout bugs (#1231 follow-up)

- scope logout to current session only — remove tokenVersion bump that was invalidating all other active sessions across devices
- reset bootstrap singleton on auth:logout so a re-login in the same app lifetime re-fetches the profile
- replace hard redirect (window.location.href) on refresh failure with bus-driven router navigation to eliminate race with Vue lifecycle
