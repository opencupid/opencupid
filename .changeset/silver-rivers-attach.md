---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Separate image upload from gallery attach. `POST /image` now returns the
created image only; gallery membership is managed via the new
`POST /image/me/attach`, `POST /content/:contentId/image/attach`, and the
corresponding detach endpoints. `POST /content/:contentId/image` is removed.
