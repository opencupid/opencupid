---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Revert UserContent backend abstraction (#1406) and frontend `useUserContentActions` composable (#1407). Wire format unchanged. Clears the way for a class-table-inheritance redesign tracked in `docs/superpowers/specs/2026-05-08-user-content-polymorphism-design.md`.
