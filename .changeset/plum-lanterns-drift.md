---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Add an optional `FALLBACK_LOCALE` env var for the locale used when a requested language has no translations. Defaults to `en`; a value without translations degrades to `en` rather than failing.
