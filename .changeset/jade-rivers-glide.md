---
'@opencupid/backend': patch
'@opencupid/frontend': patch
'@opencupid/admin': patch
---

Bump patch and minor versions across the monorepo (Renovate-style catch-up):
vue 3.5.34, vitest 4.1.5, fastify 5.8.5, @sentry/* 10.52, axios 1.16,
bullmq 5.76.6, prettier 3.8.3, eslint 10.3.0, typescript-eslint 8.59.2,
@vueuse/* 14.3.0, @playwright/test 1.59.1, dompurify 3.4.2, dotenv 17.4.2,
ioredis 5.10.1, sass 1.99.0, ws 8.20.0, plus other patch bumps. No major
versions; `zod-prisma-types` held at 3.2.4 (3.3.x emits zod-v4 syntax).
Also drops the unused `@google-cloud/translate` backend dependency.
