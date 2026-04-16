---
'@opencupid/backend': patch
---

Fix profile image variant cutting off faces by replacing hand-rolled crop
geometry with smartcrop-sharp content-aware cropping and BlazeFace face boosts
