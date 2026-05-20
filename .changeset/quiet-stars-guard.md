---
'@opencupid/frontend': patch
---

Guard ImageCarousel in ProfileContent against undefined profileImages to avoid Vue prop warning and render crash on first MyProfile paint.
