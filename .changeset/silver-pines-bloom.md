---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Migrate to zod 4 and zod-prisma-types 3.5.x. Update central validation utilities to use `z.flattenError` and `z.treeifyError`. Adjust `z.ZodType` generics to the new 2-arg signature.
