---
'@opencupid/backend': minor
'@opencupid/shared': minor
---

Accept optional `imageIds` on `POST /api/post`, `POST /api/event`, `POST /api/community` and attach those images to the new content atomically. Exports a new `MAX_IMAGES_PER_GALLERY = 6` constant from `@zod/image/image.dto`; the per-kind Create schemas gain optional `imageIds`, and the per-kind Update schemas explicitly omit it.
