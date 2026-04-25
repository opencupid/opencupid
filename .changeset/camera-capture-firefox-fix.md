---
'@opencupid/frontend': patch
---

Fix "Take Photo" button opening the gallery instead of the camera in Firefox/Android (#234). The image upload input now uses MIME-type values in `accept` so the `capture` attribute is honored across browsers.
