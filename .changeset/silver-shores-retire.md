---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Retire the persistent SocialMatchFilter model in favour of ephemeral, client-side browse filtering. Tag selection now lives in a session-only Pinia store and is passed to bounds/cluster queries via a `?tagIds=` query param. The location input becomes a flyTo-only control that no longer filters results. The legacy `GET/PATCH /find/social/filter` endpoints remain as deprecated no-op shims so stale frontends keep working until all clients are updated.
