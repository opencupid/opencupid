---
'@opencupid/frontend': patch
---

Send auth failure codes in the Umami event name (`auth-token-failed:<code>`, `auth-magic-link-failed:<code>`) so each failure shows up as its own event
