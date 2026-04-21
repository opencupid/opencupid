---
'@opencupid/frontend': patch
---

Remove inline Vue landing page. The public landing at `/` now lives in the separate `opencupid/landingpages` repo and is served by Traefik to anonymous visitors; authenticated visitors skip it and go straight to the SPA.
