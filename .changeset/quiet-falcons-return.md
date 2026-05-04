---
'@opencupid/backend': patch
---

Fix activity segment misclassification: returning users were being shown as "new" or "dormant" because the `activity-flush` BullMQ queue dedup (jobId=profileId + completed-job retention) silently suppressed re-enqueues well past the 30-minute session window. Replaced the queue + worker with an inline Redis `SET NX EX` debounce in `recordActivity`. The 30-min gap is now TTL-enforced and matches the semantic window. Also removes a per-worker-pickup Postgres `findFirst` that the queue path required.
