---
'@opencupid/frontend': minor
---

Add ContentImageButton to post/event/community edit dialogs. Images can now be uploaded during create (staged locally, attached on save) and during edit (immediate attach). Abandoned uploads are GC'd best-effort on dialog close.
