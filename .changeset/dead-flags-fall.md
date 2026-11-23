---
'@opencupid/backend': patch
'@opencupid/admin': patch
---

Drop the unused `Profile.isBlocked` column; blocking is `User.isBlocked` only. The admin profile panel no longer shows a "Blocked" row that always read "No".
