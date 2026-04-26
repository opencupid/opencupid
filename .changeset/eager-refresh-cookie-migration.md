---
'@opencupid/backend': patch
---

Eagerly migrate the __refresh cookie to the domain-scoped shape on every authenticated request so a planned host migration does not force existing sessions to re-authenticate.
