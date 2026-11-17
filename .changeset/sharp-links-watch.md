---
'@opencupid/backend': minor
---

Send a server-side Umami event (`magic-link-verify`) for every magic-link verification, recording who used each token and who presented an already-used one, to measure whether email link checkers use up login links.
