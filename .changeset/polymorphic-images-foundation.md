---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Polymorphic images foundation: rename ProfileImage table to Image asset row + introduce thin per-owner join tables (ProfileImage, UserContentImage). Generalize ImageService over a tagged ImageOwner union and switch image routes to owner-scoped paths.
