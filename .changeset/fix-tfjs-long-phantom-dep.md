---
'@opencupid/backend': patch
---

Fix `Cannot find module 'long'` crash when image processor first loads `@tensorflow/tfjs`. Adds a `pnpm.packageExtensions` entry to inject `long` as a missing dep of `@tensorflow/tfjs@4.22.0`.
