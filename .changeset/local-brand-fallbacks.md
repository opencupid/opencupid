---
'@opencupid/backend': minor
---

`FALLBACK_LOCALE` is set per brand: each brand's emails fall back to its own locale, and a new user who signs up with an unsupported language gets the brand's fallback instead of `en`. An unsupported `FALLBACK_LOCALE` now stops the backend at startup.
