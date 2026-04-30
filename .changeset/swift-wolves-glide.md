---
'@opencupid/frontend': patch
---

perf(map): cut main-thread work on pan/zoom and marker interactions — memoise POIs/clusters by id with markRaw, replace Vue render() icon hydration with template strings, add O(1) reverse marker→id index for OMS clicks, abort and LRU-evict popup fetches, and consume dissolved-cluster spiderfy synchronously instead of via setTimeout.
