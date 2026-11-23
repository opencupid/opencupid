---
'@opencupid/admin': minor
---

Profiles page: keep the sort order in the URL (`?sort=`) so it survives a reload, and refresh the list every 10 seconds while the browser tab is visible (pausing when hidden, refreshing immediately when it becomes visible again)
