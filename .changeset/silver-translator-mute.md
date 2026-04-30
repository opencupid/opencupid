---
'@opencupid/frontend': patch
'@opencupid/admin': patch
---

Disable browser auto-translation to prevent crash on Chrome iOS when a Hungarian user landed on the app and Chrome's translator wrapped Vue-rendered text nodes in `<font>` tags, causing Vue's renderer to recurse infinitely.
