---
'@opencupid/backend': patch
'@opencupid/admin': patch
---

Expose `User.originDomain` and `User.language` in the admin UI — a new `Origin` column in the users table (last data column, before action buttons) and two new rows (`Language`, `Origin`) in the user detail modal. Backend `/admin/users` list endpoint now returns both fields; `/admin/users/:id` adds `originDomain` (already had `language`).
