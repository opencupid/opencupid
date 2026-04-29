---
'@opencupid/frontend': minor
---

Extract `useUserContentActions` composable and refactor `postStore` to setup syntax. Generic CRUD/fetch action set is now reusable for future content stores (e.g. Event). All public store property and action names preserved — no consumer changes.
