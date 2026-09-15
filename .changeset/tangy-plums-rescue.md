---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Normalize `User.language` to a supported locale at every write boundary (signup, self-service update, admin update), instead of only validating it on read. Fixes prototype-pollution-shaped `in appLocales` checks in the admin route and the frontend i18n store.
