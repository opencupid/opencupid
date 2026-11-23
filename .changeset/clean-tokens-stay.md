---
'@opencupid/frontend': patch
---

Umami no longer receives the magic-link login token or the unsubscribe token: a `data-before-send` hook removes them from each event's URL and referrer.
