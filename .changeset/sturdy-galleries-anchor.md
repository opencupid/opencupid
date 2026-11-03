---
'@opencupid/backend': minor
'@opencupid/shared': patch
---

Replace the profile/post gallery join tables and the shared `Image.position` with a single `ImageAttachment` table (#1581). The database now enforces one gallery per image and unique positions per gallery; positions come from a sequence, so uploads always append and never collide. Fixes position gaps/duplicates, stale `Profile.hasFace`, concurrent-upload failures, and author avatars that could show a non-primary photo. Includes a data migration.
