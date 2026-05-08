---
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Migrate to Prisma 7 with the `@prisma/adapter-pg` driver adapter and `prisma.config.ts` (datasource URL moved out of `schema.prisma`). `packages/shared` bumps `@prisma/client` to 7.x to keep workspace types consistent.
