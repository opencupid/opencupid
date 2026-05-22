---
'@opencupid/backend': patch
---

Fix database seed crash on Prisma 7 by importing the adapter-wired PrismaClient singleton instead of constructing a bare client.
