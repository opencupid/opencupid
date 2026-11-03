---
'@opencupid/backend': patch
---

Keep image gallery positions contiguous: deleting, detaching or reordering images no longer leaves gaps or duplicate positions, and a data migration renumbers existing galleries and re-syncs Profile.hasFace
