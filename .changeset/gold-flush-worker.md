---
'@opencupid/backend': minor
---

Replace Redis-debounced per-request activity writes with a BullMQ flush worker that runs every 10 minutes and gap-checks against Postgres directly, fixing FK violations caused by stale sessions for deleted users
