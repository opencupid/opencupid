---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Normalize `User.language` to a supported locale at every write boundary (signup, self-service update, admin update). Add a required `FALLBACK_LOCALE` env var in place of the hardcoded fallback, and pick the browser language from the full `navigator.languages` preference list instead of only its first entry.
