---
'@opencupid/backend': patch
---

Fix docker build failing after Prisma 7 upgrade: set placeholder `DATABASE_URL` in builder stage so `prisma.config.ts` resolves at codegen time.
