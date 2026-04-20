---
'@opencupid/backend': minor
---

Split backend into dedicated API and worker containers. Workers are no longer instantiated as import side effects inside API replicas; repeatable/cron jobs register exactly once from a single `worker.ts` entrypoint, bull-board moves to the worker container on port 3100, and a shared ioredis connection replaces four ad-hoc ones. Traefik's admin router is split accordingly so `/api` stays on the backend while `/bull-board` points at the worker.
