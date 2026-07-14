---
'@opencupid/admin': minor
'@opencupid/backend': minor
---

Consolidate the admin Users view into Profiles: the Users menu item and page are removed. The Profiles page gains a "Not onboarded (N)" tab listing users without a profile, and the profile detail modal gains Profile/User tabs — the User tab shows the user record with editable Active/Blocked flags (loaded lazily on first open). The `/admin/profiles` search now also matches user email, phone number, and user ID, and `GET /admin/users` is a leaner list endpoint with a `hasProfile` filter.
