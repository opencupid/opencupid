---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

UserContent polymorphism via class-table inheritance: introduces `UserContent` base table + `PostExtension`/`EventExtension` per-kind tables. Adds Event as a second content kind. Unified `/api/content/{feed,bounds,nearby,profile/:id,:id}` reads operate on all kinds uniformly. Per-kind CRUD moves to `/api/content/posts/*` and `/api/content/events/*`. Cluster, supercluster and search now query `UserContent` and consume kind-agnostic rows.

Frontend retargets post URLs to `/content/posts/*`. Event-specific UI (cards, edit dialogs, router routes) is deferred to a follow-up PR.
