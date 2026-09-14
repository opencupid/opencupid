---
'@opencupid/backend': patch
---

Resolve a stored user language to the locale its content actually renders in
before advertising it, so `<html lang>` on outbound email cannot contradict
the body it describes.
