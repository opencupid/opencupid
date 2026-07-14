---
'@opencupid/admin': minor
'@opencupid/backend': minor
---

Consolidate the admin Users view into Profiles: the Users menu item and page are removed, and the profile detail modal now has Profile/User tabs — the User tab shows the user record with editable Active/Blocked flags. The `/admin/profiles` search now also matches user email, phone number, and user ID, and the unused `GET /admin/users` list endpoint was removed.
