---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/admin': patch
'@opencupid/shared': minor
---

Require email at registration; remove phone-only auth path. Migrates existing phone-only users to placeholder emails (`<userId>@phone.migrated.local`).
