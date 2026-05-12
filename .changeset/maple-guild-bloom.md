---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Add a `community` user-content kind with a nullable `yearFounded` attribute. Refactor the cluster point-properties type to reuse the canonical `UserContentKind`, and tighten the polymorphic dispatch sites to exhaustive switches so future kinds fail compilation when unhandled. Also documents the eight-stage process for adding a new user-content type in `docs/user-content-howto.md`.
