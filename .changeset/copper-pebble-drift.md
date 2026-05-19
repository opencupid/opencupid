---
'@opencupid/backend': minor
'@opencupid/shared': patch
---

Remove unused `ConnectionRequest` model along with `ConnectionType` and `ConnectionStatus` enums — they had no runtime usage anywhere in the codebase. The generated Zod schemas for these types are likewise removed from `@opencupid/shared`.
