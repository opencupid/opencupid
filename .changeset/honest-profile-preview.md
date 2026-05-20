---
'@opencupid/frontend': patch
---

Fix MyProfile owner drawer crashing on first paint with `TypeError: can't access property 0, props.images is undefined` when opening before profile data has loaded.
