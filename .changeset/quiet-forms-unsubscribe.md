---
'@opencupid/backend': patch
---

Accept RFC 8058 one-click unsubscribe POSTs with form-urlencoded or multipart bodies; they returned 415 so mail providers' unsubscribe button never worked (#1649)
