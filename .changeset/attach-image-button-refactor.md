---
'@opencupid/frontend': patch
---

Extract ImageEditor logic into a useImageEditor composable and introduce
AttachImageButton, replacing ContentImageButton across messaging, posts,
events, and communities. Inline thumbnails now expose a hover X-overlay
for quick removal without opening the modal.
