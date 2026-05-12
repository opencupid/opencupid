---
'@opencupid/backend': minor
---

Remove unused `prisma-zod-generator` devDependency. The Prisma schema generator block uses `zod-prisma-types` (already at v3); `prisma-zod-generator@0.8.13` was dead weight and pulled in pre-Prisma-7 dependencies incompatible with the new stack.
