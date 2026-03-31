---
'@opencupid/backend': minor
---

Replace Redis-debounced per-request activity writes with a BullMQ flush worker that gap-checks against Postgres directly, fixing FK violations caused by stale sessions for deleted users
