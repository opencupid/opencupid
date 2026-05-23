---
'@opencupid/frontend': patch
---

Split `ProfileContent` into a lean read-only component and an `EditableProfileContent` wrapper that injects edit fields via slots. Public/conversation views no longer load the edit-field machinery or form editor bundles.
