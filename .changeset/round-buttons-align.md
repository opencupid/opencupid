---
'@opencupid/frontend': patch
---

Make `.btn-rounded` own its own box so every circular icon button renders at the same size. The message composer's mic, call and attach-image buttons were three different shapes: the class only set width and height, so the padding it inherited from whichever Bootstrap size class a caller added changed the icon size, the button shrank when it sat next to a wider flex sibling, and the attach-image button's `w-100 h-100` overrode the fixed size entirely.

Also fix the post editor's attach-image button, which was drawn by styling the layout wrapper around the button rather than the button itself. `AttachImageButton` now takes a `buttonClass` and passes it to the real control, which removes a duplicated circular-button rule in favour of the shared `.btn-icon`, and it lays the upload button and its thumbnails out in a row at the start of the form field, which the old markup only achieved as a side effect of the wrapper's fixed height.
