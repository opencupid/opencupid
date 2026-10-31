---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Browse grid links keep their filters: the tags and map area are in the URL (`/browse/grid?tags=…&bbox=…`), restored when a link is opened, via a new `GET /tags/by-ids` endpoint (#1565)
