---
'@opencupid/backend': minor
---

Detect cross-brand login attempts: when the email matches an existing user whose `originDomain` differs from the serving brand, set an `__o` cookie with the user's origin domain and rewrite the magic-link URL to target that origin.
