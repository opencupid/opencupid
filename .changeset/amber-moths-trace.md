---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Break cross-brand login redirect loop by making __o cookie stamping authoritative on both /send-magic-link and /verify-token, and removing the direct-redirect bypass for /auth and /magic-link in the frontend inline redirect script.
