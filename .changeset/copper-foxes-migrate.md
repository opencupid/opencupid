---
'@opencupid/frontend': patch
---

Inline script in `index.html` reads the `__o` cookie and redirects to `/_migrate?to=<path>` when the user's origin brand hostname differs from the currently served hostname. Skips mid-auth flows (`/auth`, `/magic-link`, `/_migrate`). Runs before the Vue bundle loads to avoid races and uses `location.replace` so the redirected URL does not become a back-button entry.
