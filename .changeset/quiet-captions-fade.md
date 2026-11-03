---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Fix image upload returning 500 when the multipart request has no captionText field; drop the never-populated caption field from uploads
