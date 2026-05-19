---
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Add ContentImageButton to post/event/community edit dialogs. Images can now be uploaded during create (staged locally, attached on save) and during edit (immediate attach). Abandoned uploads are GC'd best-effort on dialog close. Adds `userContent.image_button.{label,modal_title}` i18n keys to `@opencupid/shared` (en + hu).
