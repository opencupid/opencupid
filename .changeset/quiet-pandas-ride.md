---
'@opencupid/frontend': patch
---

Fix axios interceptor and `safeApiCall` mistakenly classifying request cancellations (axios `CanceledError`) as network failures, which fired `api:offline` whenever an in-flight popup or cluster fetch was aborted (e.g. on map pan/zoom that closed an open hover popup).
