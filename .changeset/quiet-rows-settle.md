---
'@opencupid/admin': minor
'@opencupid/backend': minor
---

Admin profiles table: drop Social/Active columns, show segment badge and face icon next to name, add relative Last active column, Profile link button, and a sort dropdown (date created / last active). Profile detail modal gains an Activity tab with conversation, message, like and match counts. The standalone Activity page and its `GET /admin/activity` endpoint are removed; the Signups and Daily Active KPIs now open hourly/daily drill-down charts like Interactions and Messages.
