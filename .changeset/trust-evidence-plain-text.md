---
'@opencupid/backend': patch
'@opencupid/admin': patch
'@opencupid/shared': patch
---

Store `ProfileTrustFlag.evidence` as plain text instead of `Json`. The Json column emitted by #1368 caused zod-prisma-types to ship a runtime `import { Prisma } from '@prisma/client'` in the shared zod barrel, breaking the frontend Vite build. Plain text restores the type-only import; the audit blob shapes were vestigial (single-string contents in two of three reasons; `sampleConversationIds` written but never read).
