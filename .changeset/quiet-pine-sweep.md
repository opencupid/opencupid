---
'@opencupid/frontend': patch
'@opencupid/backend': patch
---

Remove orphaned i18n keys from `packages/shared/i18n/{en,hu}.json` that were no
longer referenced by any `t()`/`$t()` call in the codebase.
