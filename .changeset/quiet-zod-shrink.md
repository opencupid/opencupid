---
'@opencupid/backend': patch
'@opencupid/frontend': patch
'@opencupid/shared': patch
---

Shrink generated zod schemas: enable `createInputTypes = false` + `useMultipleFiles = true` on `zod-prisma-types`. Drops ~96% of generated LOC (18 155 → 723 lines across 62 small files). No runtime behavior change; 14 type-only imports migrated to deep paths to work around upstream issue #249.
